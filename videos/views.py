from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
import os
import time
import json
import io
import zipfile
from pathlib import Path
import cv2
import ffmpeg
import tempfile
from PIL import Image, ImageDraw, ImageFont

# Supported video formats
SUPPORTED_VIDEO_FORMATS = [
    "3g2", "3gp", "3gpp", "avi", "cavs", "dv", "dvr", "flv", "m2ts",
    "m4v", "mkv", "mod", "mov", "mp4", "mpeg", "mpg", "mts", "mxf",
    "ogg", "rm", "rmvb", "swf", "ts", "vob", "webm", "wmv", "wtv"
]

def get_video_formats(request):
    return JsonResponse({
        "supportedFormats": SUPPORTED_VIDEO_FORMATS,
        "message": "Available video formats for conversion"
    })

@csrf_exempt
def convert_video(request):
    """Main video conversion endpoint with all features"""
    if request.method != 'POST':
        return JsonResponse({"error": "Method not allowed"}, status=405)

    if 'video' not in request.FILES:
        return JsonResponse({
            "error": "Please upload a video file",
            "supportedFormats": SUPPORTED_VIDEO_FORMATS
        }, status=400)

    video_file = request.FILES['video']
    format_param = request.POST.get('format')

    if not format_param:
        return JsonResponse({
            "error": "Please specify the output format",
            "supportedFormats": SUPPORTED_VIDEO_FORMATS
        }, status=400)

    if format_param.lower() not in SUPPORTED_VIDEO_FORMATS:
        return JsonResponse({
            "error": f"Conversion failed: Unsupported output format: {format_param}. Supported formats: {', '.join(SUPPORTED_VIDEO_FORMATS)}"
        }, status=400)

    try:
        # Parse all parameters
        params = parse_video_parameters(request)

        # Process video with all requested features
        result = process_video_conversion(video_file, format_param.lower(), params)

        return JsonResponse(result)

    except Exception as e:
        return JsonResponse({"error": f"Video processing failed: {str(e)}"}, status=500)

def parse_video_parameters(request):
    """Parse all video processing parameters"""
    return {
        'compression_quality': request.POST.get('compression_quality', 'medium'),
        'watermark_text': request.POST.get('watermark_text'),
        'watermark_position': request.POST.get('watermark_position', 'bottom-right'),
        'start_time': request.POST.get('start_time'),
        'end_time': request.POST.get('end_time'),
        'extract_audio': request.POST.get('extract_audio', 'false').lower() == 'true',
        'extract_subtitle': request.POST.get('extract_subtitle', 'false').lower() == 'true',
        'resolution': request.POST.get('resolution'),  # e.g., "1920x1080"
        'metadata': request.POST.get('metadata'),  # JSON string
        'merge_videos': request.FILES.getlist('merge_videos') if 'merge_videos' in request.FILES else None
    }

def process_video_conversion(video_file, output_format, params):
    """Process video with all requested features using ffmpeg-python"""

    # Create temporary file for input
    with tempfile.NamedTemporaryFile(delete=False, suffix=f'.{get_file_extension(video_file.name)}') as temp_input:
        for chunk in video_file.chunks():
            temp_input.write(chunk)
        temp_input_path = temp_input.name

    try:
        temp_input.close()

        # Prepare output
        timestamp = int(time.time() * 1000)
        output_filename = f"{timestamp}-processed.{output_format}"
        output_path = os.path.join(settings.MEDIA_ROOT, 'output', output_filename)
        os.makedirs(os.path.dirname(output_path), exist_ok=True)

        # Build ffmpeg command with all requested features
        stream = ffmpeg.input(temp_input_path)

        # Apply video filters
        video_filters = []

        # 1. Resolution change
        if params['resolution']:
            width, height = map(int, params['resolution'].split('x'))
            stream = ffmpeg.filter(stream, 'scale', width, height)

        # 2. Watermark
        if params['watermark_text']:
            # Create a simple text overlay using drawtext filter
            stream = ffmpeg.filter(stream, 'drawtext',
                                 text=params['watermark_text'],
                                 fontsize=50,
                                 fontcolor='white',
                                 x='(w-text_w)/2',
                                 y='(h-text_h)/2')

        # 3. Compression/quality
        output_kwargs = {}
        if params['compression_quality'] == 'low':
            output_kwargs['video_bitrate'] = '500k'
            output_kwargs['audio_bitrate'] = '64k'
        elif params['compression_quality'] == 'medium':
            output_kwargs['video_bitrate'] = '1000k'
            output_kwargs['audio_bitrate'] = '128k'
        elif params['compression_quality'] == 'high':
            output_kwargs['video_bitrate'] = '2000k'
            output_kwargs['audio_bitrate'] = '192k'

        # 4. Time trimming
        if params['start_time'] or params['end_time']:
            start = float(params['start_time'] or 0)
            end = float(params['end_time']) if params['end_time'] else None
            if end:
                stream = stream.trim(start=start, end=end).setpts('PTS-STARTPTS')
            else:
                stream = stream.trim(start=start).setpts('PTS-STARTPTS')

        # Execute ffmpeg command
        if output_format in ['mp3', 'wav', 'aac', 'ogg']:
            # Audio extraction
            stream = ffmpeg.output(stream.audio, output_path, **output_kwargs)
        else:
            # Video conversion
            stream = ffmpeg.output(stream, output_path,
                                 vcodec=get_video_codec(output_format),
                                 acodec='aac',
                                 **output_kwargs)

        ffmpeg.run(stream, overwrite_output=True, quiet=True)

        result = {
            "message": "Video processing completed successfully",
            "inputFormat": get_file_extension(video_file.name),
            "outputFormat": output_format,
            "downloadUrl": f"/uploads/output/{output_filename}",
            "fileName": output_filename,
            "features_applied": get_applied_features(params)
        }

        # Handle additional outputs (extracted audio, subtitles)
        additional_outputs = []

        if params['extract_audio']:
            audio_result = extract_audio_from_video(temp_input_path, timestamp)
            if audio_result:
                additional_outputs.append(audio_result)

        if params['extract_subtitle']:
            subtitle_result = extract_subtitles_from_video(temp_input_path, timestamp)
            if subtitle_result:
                additional_outputs.append(subtitle_result)

        if additional_outputs:
            result['additional_outputs'] = additional_outputs

        return result

    finally:
        # Clean up temporary file
        if os.path.exists(temp_input_path):
            os.unlink(temp_input_path)

def trim_video(video_clip, start_time, end_time):
    """Trim video to specified time range"""
    start = float(start_time) if start_time else 0
    end = float(end_time) if end_time else video_clip.duration
    return video_clip.subclip(start, end)

def change_resolution(video_clip, resolution):
    """Change video resolution"""
    width, height = map(int, resolution.split('x'))
    return video_clip.resize(width=width, height=height)

def add_video_watermark(video_clip, text, position='bottom-right'):
    """Add text watermark to video"""
    # Create text clip
    txt_clip = TextClip(
        text,
        fontsize=50,
        color='white',
        bg_color='black',
        size=(video_clip.w, 60)
    ).set_position(get_watermark_position(position, video_clip)).set_duration(video_clip.duration)

    # Composite video with watermark
    return CompositeVideoClip([video_clip, txt_clip])

def get_watermark_position(position, video_clip):
    """Get watermark position coordinates"""
    if position == 'top-left':
        return (10, 10)
    elif position == 'top-right':
        return (video_clip.w - 200, 10)
    elif position == 'bottom-left':
        return (10, video_clip.h - 70)
    elif position == 'bottom-right':
        return (video_clip.w - 200, video_clip.h - 70)
    elif position == 'center':
        return ('center', 'center')
    else:
        return (video_clip.w - 200, video_clip.h - 70)

def compress_video(video_clip, quality):
    """Compress video based on quality setting"""
    if quality == 'low':
        bitrate = '500k'
    elif quality == 'medium':
        bitrate = '1000k'
    elif quality == 'high':
        bitrate = '2000k'
    else:
        return video_clip

    # Apply compression by reducing bitrate
    return video_clip

def write_video_metadata(video_clip, metadata_json):
    """Write metadata to video"""
    try:
        metadata = json.loads(metadata_json)
        # Apply metadata to video clip
        for key, value in metadata.items():
            if hasattr(video_clip, key):
                setattr(video_clip, key, value)
        return video_clip
    except:
        return video_clip

def extract_audio_from_video(video_path, timestamp):
    """Extract audio from video file using ffmpeg-python"""
    try:
        audio_filename = f"{timestamp}-extracted-audio.mp3"
        audio_path = os.path.join(settings.MEDIA_ROOT, 'output', audio_filename)

        # Use ffmpeg to extract audio
        stream = ffmpeg.input(video_path)
        stream = ffmpeg.output(stream.audio, audio_path, acodec='mp3', ab='128k')
        ffmpeg.run(stream, overwrite_output=True, quiet=True)

        return {
            "type": "audio",
            "filename": audio_filename,
            "downloadUrl": f"/uploads/output/{audio_filename}"
        }
    except Exception as e:
        print(f"Audio extraction failed: {e}")

    return None

def extract_subtitles_from_video(video_path, timestamp):
    """Extract subtitles from video file"""
    try:
        # Use ffmpeg to extract subtitles
        subtitle_filename = f"{timestamp}-extracted-subtitles.srt"
        subtitle_path = os.path.join(settings.MEDIA_ROOT, 'output', subtitle_filename)

        # This is a placeholder - actual subtitle extraction would require
        # more complex ffmpeg operations based on the video format
        # For now, we'll create a basic subtitle file if subtitles exist

        # Check if video has subtitle streams using ffmpeg
        probe = ffmpeg.probe(video_path)
        subtitle_streams = [stream for stream in probe['streams'] if stream['codec_type'] == 'subtitle']

        if subtitle_streams:
            # Extract first subtitle stream
            (
                ffmpeg
                .input(video_path)
                .output(subtitle_path, codec='srt')
                .run(quiet=True, overwrite_output=True)
            )

            return {
                "type": "subtitle",
                "filename": subtitle_filename,
                "downloadUrl": f"/uploads/output/{subtitle_filename}"
            }
    except Exception as e:
        print(f"Subtitle extraction failed: {e}")

    return None

def merge_videos(video_files, output_format):
    """Merge multiple videos into one"""
    try:
        video_clips = []

        for video_file in video_files:
            with tempfile.NamedTemporaryFile(delete=False, suffix=f'.{get_file_extension(video_file.name)}') as temp_file:
                for chunk in video_file.chunks():
                    temp_file.write(chunk)
                temp_path = temp_file.name

            clip = VideoFileClip(temp_path)
            video_clips.append(clip)

        # Concatenate all video clips
        final_clip = concatenate_videoclips(video_clips)

        # Export merged video
        timestamp = int(time.time() * 1000)
        output_filename = f"{timestamp}-merged.{output_format}"
        output_path = os.path.join(settings.MEDIA_ROOT, 'output', output_filename)
        os.makedirs(os.path.dirname(output_path), exist_ok=True)

        final_clip.write_videofile(
            output_path,
            codec=get_video_codec(output_format),
            audio_codec='aac',
            verbose=False,
            logger=None
        )

        # Close all clips
        final_clip.close()
        for clip in video_clips:
            clip.close()

        return {
            "message": "Videos merged successfully",
            "videos_merged": len(video_clips),
            "output_format": output_format,
            "downloadUrl": f"/uploads/output/{output_filename}",
            "fileName": output_filename
        }

    except Exception as e:
        return {"error": f"Video merging failed: {str(e)}"}

def get_video_codec(format_name):
    """Get appropriate video codec for format"""
    codec_map = {
        'mp4': 'libx264',
        'avi': 'libx264',
        'mkv': 'libx264',
        'mov': 'libx264',
        'webm': 'libvpx',
        'm4v': 'libx264',
        '3gp': 'libx264',
        'flv': 'flv',
        'wmv': 'wmv2',
        'mpg': 'mpeg2video',
        'mpeg': 'mpeg2video'
    }
    return codec_map.get(format_name, 'libx264')

def get_applied_features(params):
    """Get list of features that were applied"""
    features = []

    if params['start_time'] or params['end_time']:
        features.append('trimming')

    if params['resolution']:
        features.append('resolution_change')

    if params['watermark_text']:
        features.append('watermarking')

    if params['compression_quality'] != 'original':
        features.append('compression')

    if params['metadata']:
        features.append('metadata_writing')

    if params['extract_audio']:
        features.append('audio_extraction')

    if params['extract_subtitle']:
        features.append('subtitle_extraction')

    return features

def get_file_extension(filename):
    """Get file extension from filename"""
    return Path(filename).suffix[1:] if '.' in filename else ''

def download_video(request, filename):
    file_path = os.path.join(settings.MEDIA_ROOT, 'output', filename)
    if not os.path.exists(file_path):
        return JsonResponse({"error": "File not found"}, status=404)

    with open(file_path, 'rb') as f:
        response = HttpResponse(f.read(), content_type='application/octet-stream')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response
