from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
import os
import time
import zipfile
import io
import tempfile
from pathlib import Path
from pydub import AudioSegment
from pydub.effects import normalize
from gtts import gTTS

SUPPORTED_FORMATS = ["aac", "ac3", "aif", "aifc", "aiff", "amr", "au", "caf", "dss", "flac", "m4a", "m4b", "mp3", "oga", "voc", "wav", "weba", "wma"]

def add_audio_watermark(audio, watermark_text, volume_reduction_db=-6):
    """Add audio watermark by converting text to speech and mixing it continuously with the original audio"""
    if not watermark_text:
        return audio

    try:
        # Generate speech from text using gTTS
        tts = gTTS(text=watermark_text, lang='en', slow=False)

        # Save TTS audio to temporary file
        with tempfile.NamedTemporaryFile(suffix='.mp3', delete=False) as temp_file:
            temp_filename = temp_file.name
            tts.save(temp_filename)

        # Load the generated speech audio
        speech_audio = AudioSegment.from_mp3(temp_filename)

        # Clean up temporary file
        os.unlink(temp_filename)

        # Make speech audio much quieter (background watermark)
        speech_audio = speech_audio + volume_reduction_db

        # Get durations
        main_duration = len(audio)
        speech_duration = len(speech_audio)

        # Create continuous watermark by distributing speech throughout the audio
        if speech_duration >= main_duration:
            # If speech is longer than main audio, trim it
            speech_audio = speech_audio[:main_duration]
        else:
            # Create a continuous loop by overlaying multiple instances
            # Calculate how many times we need to overlay the speech
            interval_ms = max(30000, speech_duration * 2)  # Minimum 30 seconds between repetitions
            num_overlays = (main_duration // interval_ms) + 1

            # Start with the original audio
            watermarked_audio = audio

            # Overlay speech at regular intervals
            for i in range(num_overlays):
                start_time = i * interval_ms
                if start_time < main_duration:
                    # Create a silent segment for positioning
                    if start_time > 0:
                        position_silence = AudioSegment.silent(duration=start_time, frame_rate=audio.frame_rate)
                        positioned_speech = position_silence + speech_audio
                    else:
                        positioned_speech = speech_audio

                    # Trim to fit within audio duration
                    if len(positioned_speech) > main_duration:
                        positioned_speech = positioned_speech[:main_duration]

                    # Overlay on the main audio
                    watermarked_audio = watermarked_audio.overlay(positioned_speech)

            speech_audio = watermarked_audio

        # Ensure both have the same frame rate and channels
        if speech_audio.frame_rate != audio.frame_rate:
            speech_audio = speech_audio.set_frame_rate(audio.frame_rate)

        if speech_audio.channels != audio.channels:
            if audio.channels == 1:
                speech_audio = speech_audio.set_channels(1)
            else:
                speech_audio = speech_audio.set_channels(2)

        return speech_audio

    except Exception as e:
        print(f"Audio watermarking failed: {e}")
        return audio  # Return original audio if watermarking fails

def get_formats(request):
    return JsonResponse({
        "supportedFormats": SUPPORTED_FORMATS,
        "message": "Available audio formats for conversion"
    })

def process_zip_batch(zip_content, format_param, bitrate=None, start_time=None, end_time=None, normalize_volume=False, watermark_text=None):
    """Process a ZIP file containing multiple audio files"""

    processed_files = []
    errors = []

    with zipfile.ZipFile(io.BytesIO(zip_content), 'r') as zip_ref:
        for file_info in zip_ref.filelist:
            if file_info.filename.lower().endswith(tuple(f'.{fmt}' for fmt in SUPPORTED_FORMATS)):
                try:
                    # Extract audio from ZIP
                    with zip_ref.open(file_info.filename) as file:
                        audio_content = file.read()

                    # Process the audio
                    audio = AudioSegment.from_file(io.BytesIO(audio_content))
                    original_filename = Path(file_info.filename).stem

                    # Apply transformations
                    if start_time or end_time:
                        # Convert times to milliseconds
                        start_ms = int(float(start_time) * 1000) if start_time else 0
                        end_ms = int(float(end_time) * 1000) if end_time else len(audio)
                        audio = audio[start_ms:end_ms]

                    if normalize_volume:
                        audio = normalize(audio)

                    # Add audio watermark if specified
                    if watermark_text:
                        audio = add_audio_watermark(audio, watermark_text)

                    # Convert format
                    output = io.BytesIO()

                    # Set export parameters
                    export_kwargs = {}
                    if bitrate:
                        export_kwargs['bitrate'] = bitrate

                    # Export to desired format
                    audio.export(output, format=format_param, **export_kwargs)
                    processed_content = output.getvalue()

                    # Create new filename
                    new_filename = f"{original_filename}_processed.{format_param.lower()}"
                    processed_files.append((new_filename, processed_content))

                except Exception as e:
                    errors.append(f"Failed to process {file_info.filename}: {str(e)}")

    return processed_files, errors

@csrf_exempt
def convert_audio(request):
    if request.method != 'POST':
        return JsonResponse({"error": "Method not allowed"}, status=405)

    # Check if it's a single audio or ZIP file
    if 'audio' in request.FILES:
        # Single audio processing
        return convert_single_audio(request)
    elif 'zipfile' in request.FILES:
        # Batch ZIP processing
        return convert_zip_batch_audio(request)
    else:
        return JsonResponse({
            "error": "Please upload an audio file or ZIP file containing audio files",
            "supportedFormats": SUPPORTED_FORMATS
        }, status=400)

@csrf_exempt
def convert_single_audio(request):
    """Convert a single audio file with all processing options"""

    audio_file = request.FILES['audio']
    format_param = request.POST.get('format')

    if not format_param:
        return JsonResponse({
            "error": "Please specify the output format",
            "supportedFormats": SUPPORTED_FORMATS
        }, status=400)

    if format_param.lower() not in SUPPORTED_FORMATS:
        return JsonResponse({
            "error": f"Conversion failed: Unsupported output format: {format_param}. Supported formats: {', '.join(SUPPORTED_FORMATS)}"
        }, status=400)

    # Parse bitrate parameter
    bitrate = request.POST.get('bitrate')
    if bitrate:
        # Validate bitrate format (e.g., "128k", "320k", "44100")
        if not (bitrate.endswith('k') or bitrate.isdigit()):
            return JsonResponse({"error": "Bitrate must be in format like '128k' or '44100'"}, status=400)

    # Parse trimming parameters
    start_time = request.POST.get('start_time')
    end_time = request.POST.get('end_time')

    if start_time:
        try:
            float(start_time)
        except ValueError:
            return JsonResponse({"error": "Start time must be a number (seconds)"}, status=400)

    if end_time:
        try:
            float(end_time)
        except ValueError:
            return JsonResponse({"error": "End time must be a number (seconds)"}, status=400)

    # Parse volume normalization
    normalize_volume = request.POST.get('normalize_volume', 'false').lower() == 'true'

    # Parse watermark text
    watermark_text = request.POST.get('watermark_text')

    try:
        # Load audio file
        audio = AudioSegment.from_file(audio_file)
        input_format = audio_file.name.split('.')[-1].lower() if '.' in audio_file.name else 'unknown'
        original_duration = len(audio) / 1000  # Convert to seconds

        # Apply transformations
        if start_time or end_time:
            # Convert times to milliseconds
            start_ms = int(float(start_time) * 1000) if start_time else 0
            end_ms = int(float(end_time) * 1000) if end_time else len(audio)
            audio = audio[start_ms:end_ms]

        if normalize_volume:
            audio = normalize(audio)

        # Add audio watermark if specified
        if watermark_text:
            audio = add_audio_watermark(audio, watermark_text)

        # Create output file
        timestamp = int(time.time() * 1000)
        output_filename = f"{timestamp}-converted.{format_param.lower()}"
        output_path = os.path.join(settings.MEDIA_ROOT, 'output', output_filename)
        os.makedirs(os.path.dirname(output_path), exist_ok=True)

        # Set export parameters
        export_kwargs = {}
        if bitrate:
            export_kwargs['bitrate'] = bitrate

        # Export audio
        audio.export(output_path, format=format_param, **export_kwargs)

        processed_duration = len(audio) / 1000  # Convert to seconds

        return JsonResponse({
            "message": "Audio conversion successful",
            "inputFormat": input_format,
            "outputFormat": format_param.lower(),
            "originalDuration": original_duration,
            "processedDuration": processed_duration,
            "bitrate": bitrate,
            "trimmed": bool(start_time or end_time),
            "normalized": normalize_volume,
            "watermarked": bool(watermark_text),
            "watermarkText": watermark_text if watermark_text else None,
            "downloadUrl": f"/uploads/output/{output_filename}",
            "fileName": output_filename
        })

    except Exception as e:
        return JsonResponse({"error": f"Conversion failed: {str(e)}"}, status=500)

@csrf_exempt
def convert_zip_batch_audio(request):
    """Convert multiple audio files from a ZIP file"""

    zip_file = request.FILES['zipfile']
    format_param = request.POST.get('format')

    if not format_param:
        return JsonResponse({
            "error": "Please specify the output format",
            "supportedFormats": SUPPORTED_FORMATS
        }, status=400)

    if format_param.lower() not in SUPPORTED_FORMATS:
        return JsonResponse({
            "error": f"Conversion failed: Unsupported output format: {format_param}. Supported formats: {', '.join(SUPPORTED_FORMATS)}"
        }, status=400)

    # Parse common parameters
    bitrate = request.POST.get('bitrate')
    if bitrate and not (bitrate.endswith('k') or bitrate.isdigit()):
        return JsonResponse({"error": "Bitrate must be in format like '128k' or '44100'"}, status=400)

    start_time = request.POST.get('start_time')
    end_time = request.POST.get('end_time')
    normalize_volume = request.POST.get('normalize_volume', 'false').lower() == 'true'

    # Parse audio watermark text
    audio_watermark_text = request.POST.get('watermark_text')

    try:
        # Read ZIP file content
        zip_content = zip_file.read()

        # Process all audio files in the ZIP
        processed_files, errors = process_zip_batch(
            zip_content, format_param.lower(), bitrate, start_time, end_time, normalize_volume, audio_watermark_text
        )

        if not processed_files:
            return JsonResponse({
                "error": "No valid audio files found in ZIP file",
                "supportedFormats": SUPPORTED_FORMATS
            }, status=400)

        # Create ZIP file with processed audio files
        timestamp = int(time.time() * 1000)
        zip_filename = f"{timestamp}-batch-converted.zip"
        zip_path = os.path.join(settings.MEDIA_ROOT, 'output', zip_filename)
        os.makedirs(os.path.dirname(zip_path), exist_ok=True)

        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zip_out:
            for filename, content in processed_files:
                zip_out.writestr(filename, content)

        response_data = {
            "message": f"Batch conversion successful: {len(processed_files)} audio files processed",
            "outputFormat": format_param.lower(),
            "processedFiles": len(processed_files),
            "bitrate": bitrate,
            "trimmed": bool(start_time or end_time),
            "normalized": normalize_volume,
            "watermarked": bool(audio_watermark_text),
            "watermarkText": audio_watermark_text if audio_watermark_text else None,
            "downloadUrl": f"/uploads/output/{zip_filename}",
            "fileName": zip_filename,
            "files": [filename for filename, _ in processed_files]
        }

        if errors:
            response_data["warnings"] = errors

        return JsonResponse(response_data)

    except Exception as e:
        return JsonResponse({"error": f"Batch conversion failed: {str(e)}"}, status=500)

def download_audio(request, filename):
    file_path = os.path.join(settings.MEDIA_ROOT, 'output', filename)
    if not os.path.exists(file_path):
        return JsonResponse({"error": "File not found"}, status=404)

    with open(file_path, 'rb') as f:
        response = HttpResponse(f.read(), content_type='application/octet-stream')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response
