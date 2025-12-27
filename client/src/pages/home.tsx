import { useState } from "react";
import { Upload, FileSpreadsheet, Download, Loader2, Copy, Check, Terminal, FileJson } from "lucide-react";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"upload" | "json">("json");
  const [file, setFile] = useState<File | null>(null);
  const [jsonInput, setJsonInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const apiUrl = typeof window !== 'undefined' 
    ? `${window.location.protocol}//${window.location.host}`
    : 'http://localhost:5000';

  const curlCommandUpload = `curl -X POST ${apiUrl}/api/excel/process \\
  -F "files=@file.xlsx" \\
  -o output.xlsx`;

  const curlCommandJson = `curl -X POST ${apiUrl}/api/excel/create \\
  -H "Content-Type: application/json" \\
  -d '{"Sheet1": "[{\\"ID\\":1,\\"Ten\\":\\"ABC\\"}]"}' \\
  -o output.xlsx`;

  const handleCopyCurl = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
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

  const handleUploadFile = async () => {
    if (!file) {
      setError("Vui lòng chọn file");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("files", file);
      const response = await fetch("/api/excel/process", { method: "POST", body: formData });
      if (!response.ok) throw new Error("Lỗi xử lý file");
      downloadBlob(await response.blob(), `formatted_${file.name}`);
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

  const handleCreateFromJson = async () => {
    if (!jsonInput.trim()) {
      setError("Vui lòng nhập JSON data");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const jsonData = JSON.parse(jsonInput);
      const response = await fetch("/api/excel/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(jsonData),
      });
      if (!response.ok) throw new Error("Lỗi tạo file Excel");
      downloadBlob(await response.blob(), "output.xlsx");
    } catch (err: any) {
      if (err.message.includes("JSON")) {
        setError("JSON không hợp lệ. Vui lòng kiểm tra lại format.");
      } else {
        setError("Có lỗi xảy ra khi tạo file Excel");
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const sampleJson = `{
  "Văn bản mới": [
    {"ID": 1, "Tên": "Nghị định 01", "Mô tả": "Nội dung..."},
    {"ID": 2, "Tên": "Thông tư 02", "Mô tả": "Nội dung..."}
  ],
  "Văn bản sửa đổi": [
    {"ID": 1, "Tiêu đề": "Sửa đổi NĐ 01", "Ngày": "2024-01-01"}
  ]
}`;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <FileSpreadsheet className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Excel Pro</h1>
          <p className="text-muted-foreground">Tạo và định dạng Excel tự động</p>
        </div>

        {/* Tabs */}
        <div className="flex mb-4 bg-muted rounded-lg p-1">
          <button
            onClick={() => { setActiveTab("json"); setError(null); }}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === "json" ? "bg-background shadow" : "hover:bg-background/50"
            }`}
          >
            <FileJson className="w-4 h-4" /> Nhập JSON
          </button>
          <button
            onClick={() => { setActiveTab("upload"); setError(null); }}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === "upload" ? "bg-background shadow" : "hover:bg-background/50"
            }`}
          >
            <Upload className="w-4 h-4" /> Upload File
          </button>
        </div>

        <div className="bg-card border rounded-lg p-6 shadow-sm">
          {activeTab === "json" ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">JSON Data (mỗi key là 1 sheet)</label>
                <textarea
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                  placeholder={sampleJson}
                  className="w-full h-48 p-3 border rounded-md text-sm font-mono bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <button
                onClick={() => setJsonInput(sampleJson)}
                className="text-xs text-primary hover:underline"
              >
                Dùng JSON mẫu
              </button>
              {error && (
                <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{error}</div>
              )}
              <button
                onClick={handleCreateFromJson}
                disabled={loading}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 h-10 px-4 py-2 rounded-md font-medium flex items-center justify-center gap-2"
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Đang tạo...</> : <><Download className="w-4 h-4" /> Tạo Excel</>}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <label
                htmlFor="file-input"
                className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-accent/50 transition-colors"
              >
                <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">{file ? file.name : "Nhấn để chọn file Excel"}</p>
                <p className="text-xs text-muted-foreground mt-1">.xlsx hoặc .xls</p>
                <input id="file-input" type="file" className="hidden" accept=".xlsx,.xls" onChange={handleFileChange} />
              </label>
              {error && (
                <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{error}</div>
              )}
              <button
                onClick={handleUploadFile}
                disabled={!file || loading}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 h-10 px-4 py-2 rounded-md font-medium flex items-center justify-center gap-2"
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Đang xử lý...</> : <><Download className="w-4 h-4" /> Xử lý và tải về</>}
              </button>
            </div>
          )}
        </div>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p className="font-medium mb-2">Định dạng tự động:</p>
          <ul className="space-y-1">
            <li>✓ Header màu xanh, chữ trắng, in đậm</li>
            <li>✓ Tự động điều chỉnh độ rộng cột</li>
            <li>✓ Viền cho tất cả các ô</li>
            <li>✓ Màu xen kẽ cho các dòng</li>
          </ul>
        </div>

        {/* API Section */}
        <div className="mt-6 bg-card border rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Terminal className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm">API Endpoint</h3>
          </div>
          <div className="relative">
            <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
              <code>{activeTab === "json" ? curlCommandJson : curlCommandUpload}</code>
            </pre>
            <button
              onClick={() => handleCopyCurl(activeTab === "json" ? curlCommandJson : curlCommandUpload)}
              className="absolute top-2 right-2 p-2 bg-background hover:bg-accent rounded"
            >
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
