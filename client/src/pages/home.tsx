import { useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileSpreadsheet, X, CheckCircle, AlertCircle, Clock, Rows3, Columns3, FileText, Loader2, Download, RefreshCw, FileWarning } from "lucide-react";
import type { ExcelProcessResult, UploadState } from "@shared/schema";

export default function Home() {
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ExcelProcessResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [activeSheet, setActiveSheet] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const validateFile = (file: File): boolean => {
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      '.xlsx',
      '.xls'
    ];
    const extension = file.name.toLowerCase().split('.').pop();
    
    if (!validTypes.includes(file.type) && extension !== 'xlsx' && extension !== 'xls') {
      toast({
        title: "Invalid file type",
        description: "Please upload an Excel file (.xlsx or .xls)",
        variant: "destructive",
      });
      return false;
    }
    
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 10MB",
        variant: "destructive",
      });
      return false;
    }
    
    return true;
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const file = e.dataTransfer.files[0];
    if (file && validateFile(file)) {
      setSelectedFile(file);
      setResult(null);
      setErrorMessage("");
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && validateFile(file)) {
      setSelectedFile(file);
      setResult(null);
      setErrorMessage("");
    }
  }, []);

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setResult(null);
    setErrorMessage("");
    setUploadState('idle');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploadState('uploading');
    setProgress(0);
    setErrorMessage("");

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 100);

      setUploadState('processing');
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setProgress(100);

      const data: ExcelProcessResult = await response.json();

      if (data.success) {
        setResult(data);
        setUploadState('success');
        if (data.sheets && data.sheets.length > 0) {
          setActiveSheet(data.sheets[0].name);
        }
        toast({
          title: "File processed successfully",
          description: `Processed ${data.sheets?.length || 0} sheet(s) in ${data.processingTime}ms`,
        });
      } else {
        setResult(data);
        setErrorMessage(data.error || "An error occurred while processing the file");
        setUploadState('error');
        toast({
          title: "Processing failed",
          description: data.error || "An error occurred while processing the file",
          variant: "destructive",
        });
      }
    } catch (error) {
      setErrorMessage("Failed to connect to the server. Please check your connection and try again.");
      setUploadState('error');
      toast({
        title: "Upload failed",
        description: "Failed to connect to the server. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDownloadJSON = () => {
    if (!result || !result.success) return;
    
    const jsonString = JSON.stringify(result, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${result.fileName.replace(/\.[^/.]+$/, '')}_processed.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setSelectedFile(null);
    setResult(null);
    setErrorMessage("");
    setUploadState('idle');
    setProgress(0);
    setActiveSheet("");
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const currentSheet = result?.sheets?.find(s => s.name === activeSheet);
  const isUploadPhase = uploadState === 'idle' || uploadState === 'uploading' || uploadState === 'processing';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-primary flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-semibold" data-testid="text-app-title">Excel Processor</h1>
          </div>
          <Badge variant="secondary" className="hidden sm:flex" data-testid="badge-api-info">
            <span className="text-muted-foreground">API:</span>
            <code className="ml-1.5 font-mono text-xs">POST /api/upload</code>
          </Badge>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 flex-1 w-full">
        {isUploadPhase ? (
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-3" data-testid="text-page-title">Upload Excel File</h2>
              <p className="text-muted-foreground" data-testid="text-page-description">
                Upload your Excel file (.xlsx, .xls) and get structured JSON data instantly
              </p>
            </div>

            <Card>
              <CardContent className="p-6">
                <div
                  className={`
                    relative border-2 border-dashed rounded-md min-h-64 
                    flex flex-col items-center justify-center gap-4 p-8
                    transition-colors cursor-pointer
                    ${isDragOver 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-muted-foreground/50'
                    }
                    ${selectedFile ? 'border-solid' : ''}
                  `}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => !selectedFile && fileInputRef.current?.click()}
                  data-testid="dropzone-upload"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                    className="hidden"
                    onChange={handleFileSelect}
                    data-testid="input-file"
                  />

                  {!selectedFile ? (
                    <>
                      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                        <Upload className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <div className="text-center">
                        <p className="text-base font-medium mb-1">
                          Drag and drop your Excel file here
                        </p>
                        <p className="text-sm text-muted-foreground">
                          or click to browse files
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">.xlsx</Badge>
                        <Badge variant="outline">.xls</Badge>
                        <Badge variant="outline">Max 10MB</Badge>
                      </div>
                    </>
                  ) : (
                    <div className="w-full">
                      <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-md">
                        <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                          <FileSpreadsheet className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate" data-testid="text-file-name">
                            {selectedFile.name}
                          </p>
                          <p className="text-sm text-muted-foreground" data-testid="text-file-size">
                            {formatFileSize(selectedFile.size)}
                          </p>
                        </div>
                        {uploadState === 'idle' && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveFile();
                            }}
                            data-testid="button-remove-file"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>

                      {(uploadState === 'uploading' || uploadState === 'processing') && (
                        <div className="mt-4 space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-2">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              {uploadState === 'uploading' ? 'Uploading...' : 'Processing...'}
                            </span>
                            <span className="text-muted-foreground">{progress}%</span>
                          </div>
                          <Progress value={progress} className="h-2" data-testid="progress-upload" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
              {selectedFile && uploadState === 'idle' && (
                <CardFooter className="flex justify-center gap-2 border-t pt-6">
                  <Button size="lg" onClick={handleUpload} data-testid="button-upload">
                    <Upload className="w-4 h-4 mr-2" />
                    Process File
                  </Button>
                </CardFooter>
              )}
            </Card>

            <Card className="mt-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  API Usage Examples
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Get JSON response:</p>
                  <div className="bg-muted rounded-md p-4 overflow-x-auto">
                    <pre className="text-xs font-mono text-foreground">
{`curl -X POST -F "file=@yourfile.xlsx" \\
  ${typeof window !== 'undefined' ? window.location.origin : ''}/api/upload`}
                    </pre>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Download processed Excel file (ID column starts from 1):</p>
                  <div className="bg-muted rounded-md p-4 overflow-x-auto">
                    <pre className="text-xs font-mono text-foreground">
{`curl -X POST -F "file=@yourfile.xlsx" \\
  -o processed.xlsx \\
  ${typeof window !== 'undefined' ? window.location.origin : ''}/api/upload/download`}
                    </pre>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : uploadState === 'error' ? (
          <div className="max-w-2xl mx-auto">
            <Card className="border-destructive/50">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-destructive" />
                </div>
                <h3 className="text-xl font-semibold mb-2" data-testid="text-error-title">Processing Failed</h3>
                <p className="text-muted-foreground mb-2" data-testid="text-error-message">
                  {errorMessage || "An error occurred while processing your file."}
                </p>
                <div className="bg-muted/50 rounded-md p-4 mb-6 text-left">
                  <p className="text-sm font-medium mb-2">Troubleshooting tips:</p>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Ensure your file is a valid Excel file (.xlsx or .xls)</li>
                    <li>Check that the file is not corrupted or password-protected</li>
                    <li>Make sure the file size is under 10MB</li>
                    <li>Try saving the file with a different name and upload again</li>
                  </ul>
                </div>
                <div className="flex items-center justify-center gap-3">
                  <Button variant="outline" onClick={handleReset} data-testid="button-upload-different">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Different File
                  </Button>
                  <Button onClick={() => {
                    setUploadState('idle');
                    setErrorMessage("");
                  }} data-testid="button-try-again">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Try Again
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : uploadState === 'success' && result ? (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold" data-testid="text-results-title">Processing Results</h2>
                <p className="text-muted-foreground" data-testid="text-results-file">
                  {result.fileName}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {result.sheets && result.sheets.length > 0 && (
                  <Button variant="outline" onClick={handleDownloadJSON} data-testid="button-download-json">
                    <Download className="w-4 h-4 mr-2" />
                    Download JSON
                  </Button>
                )}
                <Button onClick={handleReset} data-testid="button-new-upload">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Upload New File
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-md bg-green-500/10 dark:bg-green-500/20 flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold" data-testid="stat-sheets">{result.sheets?.length || 0}</p>
                      <p className="text-xs text-muted-foreground">Sheets</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-md bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center">
                      <Rows3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold" data-testid="stat-rows">
                        {result.sheets?.reduce((acc, s) => acc + (s.rowCount || 0), 0) || 0}
                      </p>
                      <p className="text-xs text-muted-foreground">Total Rows</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-md bg-purple-500/10 dark:bg-purple-500/20 flex items-center justify-center">
                      <Columns3 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold" data-testid="stat-columns">
                        {result.sheets && result.sheets.length > 0 
                          ? Math.max(...result.sheets.map(s => s.columnCount || 0))
                          : 0}
                      </p>
                      <p className="text-xs text-muted-foreground">Max Columns</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-md bg-orange-500/10 dark:bg-orange-500/20 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold" data-testid="stat-time">{result.processingTime}</p>
                      <p className="text-xs text-muted-foreground">ms</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {result.sheets && result.sheets.length > 0 ? (
              <Card>
                <CardHeader className="pb-0">
                  <Tabs value={activeSheet} onValueChange={setActiveSheet}>
                    <TabsList className="h-auto p-1 flex-wrap gap-1">
                      {result.sheets.map((sheet) => (
                        <TabsTrigger
                          key={sheet.name}
                          value={sheet.name}
                          className="data-[state=active]:bg-background"
                          data-testid={`tab-sheet-${sheet.name}`}
                        >
                          {sheet.name}
                          <Badge variant="secondary" className="ml-2 text-xs">
                            {sheet.rowCount || 0}
                          </Badge>
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </Tabs>
                </CardHeader>
                <CardContent className="p-0">
                  {currentSheet ? (
                    currentSheet.headers && currentSheet.headers.length > 0 ? (
                      <>
                        <ScrollArea className="w-full h-[500px]">
                          <div>
                            <Table>
                              <TableHeader className="sticky top-0 bg-muted z-10">
                                <TableRow>
                                  <TableHead className="w-12 text-center font-semibold">#</TableHead>
                                  {currentSheet.headers.map((header, idx) => (
                                    <TableHead 
                                      key={idx} 
                                      className="font-semibold min-w-32"
                                      data-testid={`header-${header}`}
                                    >
                                      {header}
                                    </TableHead>
                                  ))}
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {!currentSheet.data || currentSheet.data.length === 0 ? (
                                  <TableRow>
                                    <TableCell 
                                      colSpan={currentSheet.headers.length + 1} 
                                      className="h-32 text-center text-muted-foreground"
                                    >
                                      No data rows in this sheet (headers only)
                                    </TableCell>
                                  </TableRow>
                                ) : (
                                  currentSheet.data.slice(0, 100).map((row, rowIdx) => (
                                    <TableRow 
                                      key={rowIdx}
                                      data-testid={`row-${rowIdx}`}
                                    >
                                      <TableCell className="text-center text-muted-foreground font-mono text-xs">
                                        {rowIdx + 1}
                                      </TableCell>
                                      {currentSheet.headers.map((header, cellIdx) => (
                                        <TableCell 
                                          key={cellIdx}
                                          className="font-mono text-sm"
                                          data-testid={`cell-${rowIdx}-${cellIdx}`}
                                        >
                                          {row[header] !== undefined && row[header] !== null 
                                            ? String(row[header]) 
                                            : <span className="text-muted-foreground/50">-</span>
                                          }
                                        </TableCell>
                                      ))}
                                    </TableRow>
                                  ))
                                )}
                              </TableBody>
                            </Table>
                          </div>
                        </ScrollArea>
                        {currentSheet.data && currentSheet.data.length > 100 && (
                          <div className="p-4 text-center border-t">
                            <p className="text-sm text-muted-foreground">
                              Showing first 100 of {currentSheet.data.length} rows. 
                              Download JSON for complete data.
                            </p>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="p-8 text-center">
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                          <FileWarning className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <p className="text-muted-foreground">This sheet has no columns or data</p>
                      </div>
                    )
                  ) : (
                    <div className="p-8 text-center">
                      <p className="text-muted-foreground">Select a sheet to view its data</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    <FileWarning className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Empty Workbook</h3>
                  <p className="text-muted-foreground">
                    The uploaded Excel file doesn't contain any sheets with data.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Loading...</h3>
                <p className="text-muted-foreground">Please wait while we process your request.</p>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      <footer className="border-t mt-auto">
        <div className="max-w-6xl mx-auto px-6 py-6 text-center">
          <p className="text-sm text-muted-foreground">
            Supported formats: <code className="font-mono">.xlsx</code>, <code className="font-mono">.xls</code>
            <span className="mx-2">|</span>
            Max file size: 10MB
          </p>
        </div>
      </footer>
    </div>
  );
}
