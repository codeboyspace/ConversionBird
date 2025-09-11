from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
import os
from PIL import Image, ImageDraw, ImageFont
import time
import zipfile
import io
import tempfile
from pathlib import Path

SUPPORTED_FORMATS = ["jpeg", "jpg", "png", "webp", "bmp", "gif"]

def api_info(request):
    return JsonResponse({
        "message": "ConversionBird API - Complete File Conversion Suite",
        "version": "4.0.0",
        "apis": {
            "images": {
                "description": "Advanced image processing and conversion",
                "endpoints": {
                    "GET /api/images/formats": "Get supported image formats",
                    "POST /api/images/convert": "Convert image with rotation, cropping, resizing",
                    "GET /uploads/output/:filename": "Download processed image"
                }
            },
            "documents": {
                "description": "Complete document format conversion",
                "endpoints": {
                    "GET /api/documents/": "Get document API information",
                    "GET /api/documents/formats": "Get supported document formats",
                    "POST /api/documents/convert": "Convert document to desired format",
                    "GET /uploads/documents/:filename": "Download converted document"
                }
            },
            "audios": {
                "description": "Advanced audio processing and conversion",
                "endpoints": {
                    "GET /api/audios/formats": "Get supported audio formats",
                    "POST /api/audios/convert": "Convert audio with trimming, normalization, quality control",
                    "GET /uploads/audios/:filename": "Download processed audio"
                }
            },
            "videos": {
                "description": "Complete video processing and conversion suite",
                "endpoints": {
                    "GET /api/videos/formats": "Get supported video formats",
                    "POST /api/videos/convert": "Convert video with compression, watermarking, trimming",
                    "POST /api/videos/merge": "Merge multiple videos into one",
                    "GET /uploads/videos/:filename": "Download processed video"
                }
            }
        },
        "supported_formats": {
            "images": ["jpeg", "jpg", "png", "webp", "bmp", "gif"],
            "documents": {
                "word_processing": ["doc", "docx", "rtf", "odt", "txt", "md", "json"],
                "spreadsheet": ["xls", "xlsx", "ods", "csv"],
                "presentation": ["ppt", "pptx", "odp"],
                "publishing": ["pdf", "epub", "html"]
            },
            "audios": ["aac", "ac3", "aif", "aifc", "aiff", "amr", "au", "caf", "dss", "flac", "m4a", "m4b", "mp3", "oga", "voc", "wav", "weba", "wma"]
        },
        "features": {
            "image_processing": {
                "format_conversion": "Convert between JPEG, PNG, WebP, BMP, GIF",
                "quality_control": "Adjust quality for JPEG/WebP (1-100)",
                "image_rotation": "Rotate images by any angle (0-360 degrees)",
                "image_cropping": "Crop images with x,y,width,height coordinates",
                "image_resizing": "Resize images by width, height, or both",
                "watermarking": "Add text or image watermarks to images",
                "batch_processing": "Process multiple images from ZIP files"
            },
            "document_processing": {
                "format_conversion": "Convert between all major document formats",
                "text_extraction": "Extract text from various document types",
                "batch_processing": "Process multiple documents",
                "quality_preservation": "Maintain formatting and quality"
            },
            "audio_processing": {
                "format_conversion": "Convert between AAC, AC3, AIF, AIFC, AIFF, AMR, AU, CAF, DSS, FLAC, M4A, M4B, MP3, OGA, VOC, WAV, WEBA, WMA",
                "quality_bitrate_control": "Adjust bitrate for output quality (e.g., 128k, 320k)",
                "audio_trimming": "Trim audio with start_time and end_time parameters",
                "volume_normalization": "Normalize audio volume levels",
                "audio_watermarking": "Add text-to-speech watermarks that play minimally in background",
                "batch_processing": "Process multiple audio files from ZIP files"
            }
        }
    })

def get_formats(request):
    return JsonResponse({
        "supportedFormats": SUPPORTED_FORMATS,
        "message": "Available image formats for conversion"
    })

def add_watermark(img, watermark_text=None, watermark_image=None, position='bottom-right', opacity=128):
    """Add watermark to image"""

    if img.mode != 'RGBA':
        img = img.convert('RGBA')

    # Create a copy of the image to work with
    watermarked = img.copy()
    draw = ImageDraw.Draw(watermarked, 'RGBA')

    if watermark_text:
        # Add text watermark
        try:
            # Try to use a default font, fallback to basic if not available
            font_size = min(img.size) // 20  # Scale font size based on image size
            try:
                font = ImageFont.truetype("arial.ttf", font_size)
            except:
                try:
                    font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", font_size)
                except:
                    font = ImageFont.load_default()

            # Calculate text size
            bbox = draw.textbbox((0, 0), watermark_text, font=font)
            text_width = bbox[2] - bbox[0]
            text_height = bbox[3] - bbox[1]

            # Calculate position
            img_width, img_height = img.size
            margin = 20

            if position == 'top-left':
                x, y = margin, margin
            elif position == 'top-right':
                x, y = img_width - text_width - margin, margin
            elif position == 'bottom-left':
                x, y = margin, img_height - text_height - margin
            elif position == 'bottom-right':
                x, y = img_width - text_width - margin, img_height - text_height - margin
            elif position == 'center':
                x, y = (img_width - text_width) // 2, (img_height - text_height) // 2
            else:
                x, y = img_width - text_width - margin, img_height - text_height - margin

            # Draw text with opacity
            draw.text((x, y), watermark_text, fill=(255, 255, 255, opacity), font=font)

        except Exception as e:
            # Fallback: simple text drawing without font
            img_width, img_height = img.size
            draw.text((img_width - 100, img_height - 30), watermark_text,
                     fill=(255, 255, 255, opacity))

    elif watermark_image:
        # Add image watermark
        try:
            watermark = Image.open(io.BytesIO(watermark_image)).convert('RGBA')

            # Resize watermark to be 20% of the main image
            img_width, img_height = img.size
            watermark_width = int(img_width * 0.2)
            watermark_height = int(watermark_width * watermark.height / watermark.width)
            watermark = watermark.resize((watermark_width, watermark_height), Image.Resampling.LANCZOS)

            # Calculate position
            margin = 20
            if position == 'top-left':
                x, y = margin, margin
            elif position == 'top-right':
                x, y = img_width - watermark_width - margin, margin
            elif position == 'bottom-left':
                x, y = margin, img_height - watermark_height - margin
            elif position == 'bottom-right':
                x, y = img_width - watermark_width - margin, img_height - watermark_height - margin
            elif position == 'center':
                x, y = (img_width - watermark_width) // 2, (img_height - watermark_height) // 2
            else:
                x, y = img_width - watermark_width - margin, img_height - watermark_height - margin

            # Apply opacity to watermark
            if opacity < 255:
                watermark = watermark.copy()
                alpha = watermark.split()[-1]
                alpha = alpha.point(lambda p: p * opacity // 255)
                watermark.putalpha(alpha)

            # Paste watermark
            watermarked.paste(watermark, (x, y), watermark)

        except Exception as e:
            print(f"Watermark image processing failed: {e}")

    return watermarked

def process_zip_batch(zip_content, format_param, quality=90, rotate_degrees=None,
                     crop_params=None, width=None, height=None, watermark_text=None,
                     watermark_image=None, watermark_position='bottom-right', watermark_opacity=128):
    """Process a ZIP file containing multiple images"""

    processed_files = []
    errors = []

    with zipfile.ZipFile(io.BytesIO(zip_content), 'r') as zip_ref:
        for file_info in zip_ref.filelist:
            if file_info.filename.lower().endswith(('.png', '.jpg', '.jpeg', '.webp', '.bmp', '.gif')):
                try:
                    # Extract image from ZIP
                    with zip_ref.open(file_info.filename) as file:
                        image_content = file.read()

                    # Process the image
                    img = Image.open(io.BytesIO(image_content))
                    original_filename = Path(file_info.filename).stem

                    # Apply transformations in order: resize -> crop -> rotate -> watermark
                    if width or height:
                        if width and height:
                            img = img.resize((width, height), Image.Resampling.LANCZOS)
                        elif width:
                            aspect_ratio = img.height / img.width
                            new_height = int(width * aspect_ratio)
                            img = img.resize((width, new_height), Image.Resampling.LANCZOS)
                        elif height:
                            aspect_ratio = img.width / img.height
                            new_width = int(height * aspect_ratio)
                            img = img.resize((new_width, height), Image.Resampling.LANCZOS)

                    if crop_params:
                        x, y, crop_width, crop_height = crop_params
                        img_width, img_height = img.size
                        x = min(x, img_width - 1)
                        y = min(y, img_height - 1)
                        crop_width = min(crop_width, img_width - x)
                        crop_height = min(crop_height, img_height - y)
                        if crop_width > 0 and crop_height > 0:
                            img = img.crop((x, y, x + crop_width, y + crop_height))

                    if rotate_degrees:
                        if rotate_degrees % 90 == 0:
                            rotations = rotate_degrees // 90
                            for _ in range(rotations % 4):
                                img = img.transpose(Image.Transpose.ROTATE_90)
                        else:
                            img = img.rotate(-rotate_degrees, expand=True, resample=Image.Resampling.BICUBIC)

                    # Add watermark if specified
                    if watermark_text or watermark_image:
                        img = add_watermark(img, watermark_text, watermark_image,
                                          watermark_position, watermark_opacity)

                    # Convert to RGB if necessary
                    if format_param.lower() in ['jpeg', 'jpg'] and img.mode not in ['RGB', 'L']:
                        img = img.convert('RGB')

                    # Save processed image to memory
                    output = io.BytesIO()
                    save_kwargs = {}
                    if format_param.lower() in ['jpeg', 'jpg', 'webp']:
                        save_kwargs['quality'] = quality

                    img.save(output, format_param.upper(), **save_kwargs)
                    processed_content = output.getvalue()

                    # Create new filename
                    new_filename = f"{original_filename}_processed.{format_param.lower()}"
                    processed_files.append((new_filename, processed_content))

                except Exception as e:
                    errors.append(f"Failed to process {file_info.filename}: {str(e)}")

    return processed_files, errors

@csrf_exempt
def convert_image(request):
    if request.method != 'POST':
        return JsonResponse({"error": "Method not allowed"}, status=405)

    # Check if it's a single image or ZIP file
    if 'image' in request.FILES:
        # Single image processing
        return convert_single_image(request)
    elif 'zipfile' in request.FILES:
        # Batch ZIP processing
        return convert_zip_batch(request)
    else:
        return JsonResponse({
            "error": "Please upload an image file or ZIP file containing images",
            "supportedFormats": SUPPORTED_FORMATS
        }, status=400)

@csrf_exempt
def convert_single_image(request):
    """Convert a single image with all processing options"""

    image_file = request.FILES['image']
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

    # Parse quality parameter
    quality_str = request.POST.get('quality', '90')
    try:
        quality = int(quality_str)
        if not 1 <= quality <= 100:
            raise ValueError
    except ValueError:
        return JsonResponse({"error": "Quality must be a number between 1 and 100"}, status=400)

    # Parse rotation parameter
    rotate_str = request.POST.get('rotate')
    rotate_degrees = None
    if rotate_str:
        try:
            rotate_degrees = int(rotate_str)
            if rotate_degrees < 0 or rotate_degrees > 360:
                raise ValueError
        except ValueError:
            return JsonResponse({"error": "Rotate must be a number between 0 and 360 degrees"}, status=400)

    # Parse crop parameter (format: "x,y,width,height")
    crop_params = None
    crop_str = request.POST.get('crop')
    if crop_str:
        try:
            parts = crop_str.split(',')
            if len(parts) != 4:
                raise ValueError
            crop_params = tuple(int(p.strip()) for p in parts)
            if any(p < 0 for p in crop_params):
                raise ValueError
        except ValueError:
            return JsonResponse({"error": "Crop must be in format 'x,y,width,height' with positive integers"}, status=400)

    # Parse resize parameters
    width = None
    height = None
    width_str = request.POST.get('width')
    height_str = request.POST.get('height')

    if width_str:
        try:
            width = int(width_str)
            if width <= 0:
                raise ValueError
        except ValueError:
            return JsonResponse({"error": "Width must be a positive integer"}, status=400)

    if height_str:
        try:
            height = int(height_str)
            if height <= 0:
                raise ValueError
        except ValueError:
            return JsonResponse({"error": "Height must be a positive integer"}, status=400)

    # Parse watermark parameters
    watermark_text = request.POST.get('watermark_text')
    watermark_position = request.POST.get('watermark_position', 'bottom-right')
    watermark_opacity_str = request.POST.get('watermark_opacity', '128')

    try:
        watermark_opacity = int(watermark_opacity_str)
        if not 0 <= watermark_opacity <= 255:
            raise ValueError
    except ValueError:
        return JsonResponse({"error": "Watermark opacity must be a number between 0 and 255"}, status=400)

    watermark_image = None
    if 'watermark_image' in request.FILES:
        watermark_image_file = request.FILES['watermark_image']
        watermark_image = watermark_image_file.read()

    try:
        img = Image.open(image_file)
        input_format = img.format.lower() if img.format else 'unknown'

        # Apply transformations in order: resize -> crop -> rotate -> watermark
        original_size = img.size

        # 1. Resize if width or height specified
        if width or height:
            if width and height:
                # Both specified - resize to exact dimensions
                img = img.resize((width, height), Image.Resampling.LANCZOS)
            elif width:
                # Only width specified - maintain aspect ratio
                aspect_ratio = img.height / img.width
                new_height = int(width * aspect_ratio)
                img = img.resize((width, new_height), Image.Resampling.LANCZOS)
            elif height:
                # Only height specified - maintain aspect ratio
                aspect_ratio = img.width / img.height
                new_width = int(height * aspect_ratio)
                img = img.resize((new_width, height), Image.Resampling.LANCZOS)

        # 2. Crop if crop parameters specified
        if crop_params:
            x, y, crop_width, crop_height = crop_params
            # Ensure crop area is within image bounds
            img_width, img_height = img.size
            x = min(x, img_width - 1)
            y = min(y, img_height - 1)
            crop_width = min(crop_width, img_width - x)
            crop_height = min(crop_height, img_height - y)

            if crop_width > 0 and crop_height > 0:
                img = img.crop((x, y, x + crop_width, y + crop_height))

        # 3. Rotate if rotation specified
        if rotate_degrees:
            if rotate_degrees % 90 == 0:
                # Use transpose for 90-degree rotations (better quality)
                rotations = rotate_degrees // 90
                for _ in range(rotations % 4):
                    img = img.transpose(Image.Transpose.ROTATE_90)
            else:
                # Use rotate for arbitrary angles
                img = img.rotate(-rotate_degrees, expand=True, resample=Image.Resampling.BICUBIC)

        # 4. Add watermark if specified
        if watermark_text or watermark_image:
            img = add_watermark(img, watermark_text, watermark_image,
                              watermark_position, watermark_opacity)

        # Convert to RGB if necessary for formats that require it
        if format_param.lower() in ['jpeg', 'jpg'] and img.mode not in ['RGB', 'L']:
            img = img.convert('RGB')

        timestamp = int(time.time() * 1000)
        output_filename = f"{timestamp}-converted.{format_param.lower()}"
        output_path = os.path.join(settings.MEDIA_ROOT, 'output', output_filename)
        os.makedirs(os.path.dirname(output_path), exist_ok=True)

        save_kwargs = {}
        if format_param.lower() in ['jpeg', 'jpg', 'webp']:
            save_kwargs['quality'] = quality

        img.save(output_path, format_param.upper(), **save_kwargs)

        return JsonResponse({
            "message": "Image conversion successful",
            "inputFormat": input_format,
            "outputFormat": format_param.lower(),
            "originalSize": original_size,
            "processedSize": img.size,
            "downloadUrl": f"/uploads/output/{output_filename}",
            "fileName": output_filename
        })

    except Exception as e:
        return JsonResponse({"error": f"Conversion failed: {str(e)}"}, status=500)

@csrf_exempt
def convert_zip_batch(request):
    """Convert multiple images from a ZIP file"""

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
    quality_str = request.POST.get('quality', '90')
    try:
        quality = int(quality_str)
        if not 1 <= quality <= 100:
            raise ValueError
    except ValueError:
        return JsonResponse({"error": "Quality must be a number between 1 and 100"}, status=400)

    # Parse rotation parameter
    rotate_str = request.POST.get('rotate')
    rotate_degrees = None
    if rotate_str:
        try:
            rotate_degrees = int(rotate_str)
            if rotate_degrees < 0 or rotate_degrees > 360:
                raise ValueError
        except ValueError:
            return JsonResponse({"error": "Rotate must be a number between 0 and 360 degrees"}, status=400)

    # Parse crop parameter
    crop_params = None
    crop_str = request.POST.get('crop')
    if crop_str:
        try:
            parts = crop_str.split(',')
            if len(parts) != 4:
                raise ValueError
            crop_params = tuple(int(p.strip()) for p in parts)
            if any(p < 0 for p in crop_params):
                raise ValueError
        except ValueError:
            return JsonResponse({"error": "Crop must be in format 'x,y,width,height' with positive integers"}, status=400)

    # Parse resize parameters
    width = None
    height = None
    width_str = request.POST.get('width')
    height_str = request.POST.get('height')

    if width_str:
        try:
            width = int(width_str)
            if width <= 0:
                raise ValueError
        except ValueError:
            return JsonResponse({"error": "Width must be a positive integer"}, status=400)

    if height_str:
        try:
            height = int(height_str)
            if height <= 0:
                raise ValueError
        except ValueError:
            return JsonResponse({"error": "Height must be a positive integer"}, status=400)

    # Parse watermark parameters
    watermark_text = request.POST.get('watermark_text')
    watermark_position = request.POST.get('watermark_position', 'bottom-right')
    watermark_opacity_str = request.POST.get('watermark_opacity', '128')

    try:
        watermark_opacity = int(watermark_opacity_str)
        if not 0 <= watermark_opacity <= 255:
            raise ValueError
    except ValueError:
        return JsonResponse({"error": "Watermark opacity must be a number between 0 and 255"}, status=400)

    watermark_image = None
    if 'watermark_image' in request.FILES:
        watermark_image_file = request.FILES['watermark_image']
        watermark_image = watermark_image_file.read()

    try:
        # Read ZIP file content
        zip_content = zip_file.read()

        # Process all images in the ZIP
        processed_files, errors = process_zip_batch(
            zip_content, format_param.lower(), quality, rotate_degrees,
            crop_params, width, height, watermark_text, watermark_image,
            watermark_position, watermark_opacity
        )

        if not processed_files:
            return JsonResponse({
                "error": "No valid images found in ZIP file",
                "supportedFormats": ["png", "jpg", "jpeg", "webp", "bmp", "gif"]
            }, status=400)

        # Create ZIP file with processed images
        timestamp = int(time.time() * 1000)
        zip_filename = f"{timestamp}-batch-converted.zip"
        zip_path = os.path.join(settings.MEDIA_ROOT, 'output', zip_filename)
        os.makedirs(os.path.dirname(zip_path), exist_ok=True)

        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zip_out:
            for filename, content in processed_files:
                zip_out.writestr(filename, content)

        response_data = {
            "message": f"Batch conversion successful: {len(processed_files)} images processed",
            "outputFormat": format_param.lower(),
            "processedFiles": len(processed_files),
            "downloadUrl": f"/uploads/output/{zip_filename}",
            "fileName": zip_filename,
            "files": [filename for filename, _ in processed_files]
        }

        if errors:
            response_data["warnings"] = errors

        return JsonResponse(response_data)

    except Exception as e:
        return JsonResponse({"error": f"Batch conversion failed: {str(e)}"}, status=500)

    image_file = request.FILES['image']
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

    quality_str = request.POST.get('quality', '90')
    try:
        quality = int(quality_str)
        if not 1 <= quality <= 100:
            raise ValueError
    except ValueError:
        return JsonResponse({"error": "Quality must be a number between 1 and 100"}, status=400)

    # Parse rotation parameter
    rotate_str = request.POST.get('rotate')
    rotate_degrees = None
    if rotate_str:
        try:
            rotate_degrees = int(rotate_str)
            if rotate_degrees < 0 or rotate_degrees > 360:
                raise ValueError
        except ValueError:
            return JsonResponse({"error": "Rotate must be a number between 0 and 360 degrees"}, status=400)

    # Parse crop parameter (format: "x,y,width,height")
    crop_params = None
    crop_str = request.POST.get('crop')
    if crop_str:
        try:
            parts = crop_str.split(',')
            if len(parts) != 4:
                raise ValueError
            crop_params = tuple(int(p.strip()) for p in parts)
            if any(p < 0 for p in crop_params):
                raise ValueError
        except ValueError:
            return JsonResponse({"error": "Crop must be in format 'x,y,width,height' with positive integers"}, status=400)

    # Parse resize parameters
    width = None
    height = None
    width_str = request.POST.get('width')
    height_str = request.POST.get('height')

    if width_str:
        try:
            width = int(width_str)
            if width <= 0:
                raise ValueError
        except ValueError:
            return JsonResponse({"error": "Width must be a positive integer"}, status=400)

    if height_str:
        try:
            height = int(height_str)
            if height <= 0:
                raise ValueError
        except ValueError:
            return JsonResponse({"error": "Height must be a positive integer"}, status=400)

    try:
        img = Image.open(image_file)
        input_format = img.format.lower() if img.format else 'unknown'

        # Apply transformations in order: resize -> crop -> rotate
        original_size = img.size

        # 1. Resize if width or height specified
        if width or height:
            if width and height:
                # Both specified - resize to exact dimensions
                img = img.resize((width, height), Image.Resampling.LANCZOS)
            elif width:
                # Only width specified - maintain aspect ratio
                aspect_ratio = img.height / img.width
                new_height = int(width * aspect_ratio)
                img = img.resize((width, new_height), Image.Resampling.LANCZOS)
            elif height:
                # Only height specified - maintain aspect ratio
                aspect_ratio = img.width / img.height
                new_width = int(height * aspect_ratio)
                img = img.resize((new_width, height), Image.Resampling.LANCZOS)

        # 2. Crop if crop parameters specified
        if crop_params:
            x, y, crop_width, crop_height = crop_params
            # Ensure crop area is within image bounds
            img_width, img_height = img.size
            x = min(x, img_width - 1)
            y = min(y, img_height - 1)
            crop_width = min(crop_width, img_width - x)
            crop_height = min(crop_height, img_height - y)

            if crop_width > 0 and crop_height > 0:
                img = img.crop((x, y, x + crop_width, y + crop_height))

        # 3. Rotate if rotation specified
        if rotate_degrees:
            if rotate_degrees % 90 == 0:
                # Use transpose for 90-degree rotations (better quality)
                rotations = rotate_degrees // 90
                for _ in range(rotations % 4):
                    img = img.transpose(Image.Transpose.ROTATE_90)
            else:
                # Use rotate for arbitrary angles
                img = img.rotate(-rotate_degrees, expand=True, resample=Image.Resampling.BICUBIC)

        # Convert to RGB if necessary for formats that require it
        if format_param.lower() in ['jpeg', 'jpg'] and img.mode not in ['RGB', 'L']:
            img = img.convert('RGB')

        timestamp = int(time.time() * 1000)
        output_filename = f"{timestamp}-converted.{format_param.lower()}"
        output_path = os.path.join(settings.MEDIA_ROOT, 'output', output_filename)
        os.makedirs(os.path.dirname(output_path), exist_ok=True)

        save_kwargs = {}
        if format_param.lower() in ['jpeg', 'jpg', 'webp']:
            save_kwargs['quality'] = quality

        img.save(output_path, format_param.upper(), **save_kwargs)

        return JsonResponse({
            "message": "Conversion successful",
            "inputFormat": input_format,
            "outputFormat": format_param.lower(),
            "downloadUrl": f"/uploads/output/{output_filename}",
            "fileName": output_filename
        })

    except Exception as e:
        return JsonResponse({"error": f"Conversion failed: {str(e)}"}, status=500)

def download_image(request, filename):
    file_path = os.path.join(settings.MEDIA_ROOT, 'output', filename)
    if not os.path.exists(file_path):
        return JsonResponse({"error": "File not found"}, status=404)

    with open(file_path, 'rb') as f:
        response = HttpResponse(f.read(), content_type='application/octet-stream')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response
