import { useState } from "react";
import { Upload, FileSpreadsheet, Download, Loader2, Copy, Check, Terminal } from "lucide-react";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Lấy domain hiện tại (localhost hoặc domain production)
  const apiUrl = typeof window !== 'undefined' 
    ? `${window.location.protocol}//${window.location.host}/api/excel/process`
    : 'http://localhost:5000/api/excel/process';

  const curlCommand = `curl -X POST ${apiUrl} \\
  -F "file=@file.xlsx" \\
  -o output.xlsx`;

  const handleCopyCurl = () => {
    navigator.clipboard.writeText(curlCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Kiểm tra định dạng file
      const validTypes = [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
      ];
      if (!validTypes.includes(selectedFile.type)) {
        setError("Vui lòng chọn file Excel (.xlsx hoặc .xls)");
        return;
      }
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Vui lòng chọn file");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/excel/process", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Lỗi xử lý file");
      }

      // Tải file về
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `formatted_${file.name}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // Reset form
      setFile(null);
      const fileInput = document.getElementById("file-input") as HTMLInputElement;
      if (fileInput) fileInput.value = "";
    } catch (err) {
      setError("Có lỗi xảy ra khi xử lý file");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <FileSpreadsheet className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Định dạng Excel</h1>
          <p className="text-muted-foreground">
            Upload file Excel để tự động định dạng đẹp mắt
          </p>
        </div>

        <div className="bg-card border rounded-lg p-6 shadow-sm">
          <div className="space-y-4">
            {/* File Input */}
            <div>
              <label
                htmlFor="file-input"
                className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-accent/50 transition-colors"
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {file ? file.name : "Nhấn để chọn file Excel"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    .xlsx hoặc .xls
                  </p>
                </div>
                <input
                  id="file-input"
                  type="file"
                  className="hidden"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                />
              </label>
            </div>

            {/* Error Message */}
            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                {error}
              </div>
            )}

            {/* Upload Button */}
            <button
              onClick={handleUpload}
              disabled={!file || loading}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed h-10 px-4 py-2 rounded-md font-medium flex items-center justify-center gap-2 transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Xử lý và tải về
                </>
              )}
            </button>
          </div>
        </div>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p className="font-medium mb-2">Định dạng tự động bao gồm:</p>
          <ul className="space-y-1">
            <li>✓ Header màu xanh, chữ trắng, in đậm</li>
            <li>✓ Tự động điều chỉnh độ rộng cột</li>
            <li>✓ Viền cho tất cả các ô</li>
            <li>✓ Màu xen kẽ cho các dòng</li>
          </ul>
        </div>

        {/* Curl Command Section */}
        <div className="mt-6 bg-card border rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Terminal className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm">Gọi API bằng cURL</h3>
          </div>
          <div className="relative">
            <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
              <code className="text-foreground">{curlCommand}</code>
            </pre>
            <button
              onClick={handleCopyCurl}
              className="absolute top-2 right-2 p-2 bg-background hover:bg-accent rounded transition-colors"
              title="Copy to clipboard"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Thay <code className="bg-muted px-1 rounded">file.xlsx</code> thành tên file Excel của bạn (trong thư mục hiện tại)
          </p>
        </div>
      </div>
    </div>
  );
}
