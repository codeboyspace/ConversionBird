'use client';

import { useState, useEffect } from 'react';
import { imagesApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Download, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export default function ConvertPage() {
  const { user, refreshUser } = useAuth();
  const [formats, setFormats] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFormat, setSelectedFormat] = useState('');
  const [converting, setConverting] = useState(false);
  const [convertedUrl, setConvertedUrl] = useState('');
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    const fetchFormats = async () => {
      try {
        const response = await imagesApi.getFormats();
        // Backend may return { supportedFormats: { inputs: [], outputs: [] }, message }
        // or simply an array. Prefer output formats for conversion targets.
        let raw: string[] = [];
        if (Array.isArray(response.data)) {
          raw = response.data;
        } else if (Array.isArray(response.data.supportedFormats)) {
          raw = response.data.supportedFormats;
        } else if (response.data.supportedFormats) {
          raw = response.data.supportedFormats.outputs ?? response.data.supportedFormats;
          if (!Array.isArray(raw)) raw = [];
        }
        setFormats(raw);
        if (raw.length > 0) {
          setSelectedFormat(raw[0]);
        }
      } catch (error) {
        console.error('Failed to fetch formats:', error);
      }
    };

    fetchFormats();
  }, []);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file');
      return;
    }

    setSelectedFile(file);
    setConvertedUrl('');
    setError('');
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleConvert = async () => {
    if (!selectedFile || !selectedFormat) return;

    setConverting(true);
    setError('');
    setConvertedUrl('');

    try {
      const formData = new FormData();
      formData.append('image', selectedFile);
      formData.append('format', selectedFormat);

      const response = await imagesApi.convert(formData);
      // Backend returns `downloadUrl` (or sometimes `url`). Normalize and store a usable URL.
      const rawUrl = response.data?.downloadUrl ?? response.data?.url ?? response.data?.path ?? '';
      const makeFull = (u: string) => {
        if (!u) return '';
        // If backend returns a relative path like /uploads/output/..., prefix backend origin
        if (u.startsWith('/')) return `http://localhost:5000${u}`;
        return u;
      };
      const fullUrl = makeFull(rawUrl);
      setConvertedUrl(fullUrl);
      await refreshUser();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to convert image. Please try again.');
    } finally {
      setConverting(false);
    }
  };

  const handleDownload = async () => {
    if (!convertedUrl) return;

    try {
      const response = await fetch(convertedUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `converted.${selectedFormat}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to download:', error);
    }
  };

  const handleOpen = () => {
    if (!convertedUrl) return;
    window.open(convertedUrl, '_blank');
  };

  const handleCopyUrl = async () => {
    if (!convertedUrl) return;
    try {
      await navigator.clipboard.writeText(convertedUrl);
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  };

  const usage = user?.usage ?? { conversions: 0, limit: 0 };
  const usagePercentage = usage.limit > 0 ? (usage.conversions / usage.limit) * 100 : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Convert Images</h1>
        <p className="text-slate-600 mt-2">Upload and convert images to different formats</p>
      </div>

      {user && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Monthly Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Progress value={usagePercentage} className="h-2" />
              <div className="flex justify-between text-sm text-slate-600">
                <span>
                  {usage.conversions.toLocaleString()} / {usage.limit.toLocaleString()} conversions used
                </span>
                <span>{Math.max(usage.limit - usage.conversions, 0).toLocaleString()} remaining</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Upload Image</CardTitle>
          <CardDescription>Select an image and choose the output format</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div
            className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
              dragActive
                ? 'border-blue-600 bg-blue-50'
                : 'border-slate-300 hover:border-slate-400'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {selectedFile ? (
              <div className="space-y-4">
                <ImageIcon className="h-16 w-16 text-blue-600 mx-auto" />
                <div>
                  <p className="text-lg font-medium text-slate-900">{selectedFile.name}</p>
                  <p className="text-sm text-slate-600">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedFile(null);
                    setConvertedUrl('');
                    setError('');
                  }}
                >
                  Choose Different File
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <Upload className="h-16 w-16 text-slate-400 mx-auto" />
                <div>
                  <p className="text-lg font-medium text-slate-900 mb-2">
                    Drop your image here, or click to browse
                  </p>
                  <p className="text-sm text-slate-600">
                    Supports PNG, JPG, WebP, AVIF and more
                  </p>
                </div>
                <input
                  type="file"
                  id="fileInput"
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileInput}
                />
                <Button
                  variant="outline"
                  onClick={() => document.getElementById('fileInput')?.click()}
                >
                  Select File
                </Button>
              </div>
            )}
          </div>

          {selectedFile && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-900">Output Format</label>
                <Select value={selectedFormat} onValueChange={setSelectedFormat}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select format" />
                  </SelectTrigger>
                  <SelectContent>
                    {formats.map((format) => (
                      <SelectItem key={format} value={format}>
                        {format.toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={handleConvert}
                disabled={converting || !selectedFormat}
              >
                {converting ? 'Converting...' : 'Convert Image'}
              </Button>
            </div>
          )}

          {error && (
            <div className="flex items-start space-x-2 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          {convertedUrl && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 space-y-4">
              <div className="flex items-center space-x-2 text-green-800">
                <Download className="h-5 w-5" />
                <p className="font-medium">Conversion Complete!</p>
              </div>
              <div className="flex flex-col sm:flex-row sm:space-x-3 space-y-3 sm:space-y-0">
                <Button className="w-full" size="lg" onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  Download Converted Image
                </Button>
                <Button variant="outline" className="w-full" size="lg" onClick={handleOpen}>
                  Open in New Tab
                </Button>
                <Button variant="ghost" className="w-full" size="lg" onClick={handleCopyUrl}>
                  Copy URL
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
