import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import * as XLSX from "xlsx";
import type { ExcelProcessResult, SheetData } from "@shared/schema";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    const allowedExtensions = ['.xlsx', '.xls'];
    const ext = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));
    
    if (allowedMimes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only Excel files (.xlsx, .xls) are allowed.'));
    }
  },
});

function processExcelData(buffer: Buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  
  const processedSheets: Array<{
    name: string;
    headers: string[];
    data: Record<string, unknown>[];
    rowCount: number;
    columnCount: number;
  }> = [];

  workbook.SheetNames.forEach((sheetName) => {
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];
    
    if (jsonData.length === 0) {
      processedSheets.push({
        name: sheetName,
        headers: [],
        data: [],
        rowCount: 0,
        columnCount: 0,
      });
      return;
    }

    const headers = (jsonData[0] as unknown[]).map((h, idx) => 
      h !== undefined && h !== null && String(h).trim() !== '' 
        ? String(h) 
        : `Column_${idx + 1}`
    );
    
    const idColumnIndex = headers.findIndex(h => 
      h.toLowerCase() === 'id' || 
      h.toLowerCase() === 'stt' || 
      h.toLowerCase() === 'no' ||
      h.toLowerCase() === 'số thứ tự'
    );
    
    const data = jsonData.slice(1).map((row, rowIndex) => {
      const rowData: Record<string, unknown> = {};
      headers.forEach((header, idx) => {
        if (idx === idColumnIndex) {
          rowData[header] = rowIndex + 1;
        } else {
          rowData[header] = (row as unknown[])[idx];
        }
      });
      return rowData;
    });

    processedSheets.push({
      name: sheetName,
      headers,
      data,
      rowCount: data.length,
      columnCount: headers.length,
    });
  });

  return processedSheets;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.post('/api/upload/download', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded. Please provide an Excel file.' });
      }

      const processedSheets = processExcelData(req.file.buffer);
      
      const newWorkbook = XLSX.utils.book_new();
      
      processedSheets.forEach((sheet) => {
        if (sheet.headers.length > 0) {
          const wsData = [sheet.headers, ...sheet.data.map(row => 
            sheet.headers.map(h => row[h])
          )];
          const newWorksheet = XLSX.utils.aoa_to_sheet(wsData);
          XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, sheet.name);
        }
      });

      const excelBuffer = XLSX.write(newWorkbook, { type: 'buffer', bookType: 'xlsx' });
      
      const originalName = req.file.originalname.replace(/\.[^/.]+$/, '');
      const downloadName = `${originalName}-processed.xlsx`;
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
      res.setHeader('Content-Length', excelBuffer.length);
      
      return res.send(excelBuffer);
      
    } catch (error) {
      console.error('Error processing Excel file:', error);
      return res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to process Excel file.' 
      });
    }
  });
  
  app.post('/api/upload', upload.single('file'), async (req, res) => {
    const startTime = Date.now();
    
    try {
      if (!req.file) {
        const result: ExcelProcessResult = {
          success: false,
          fileName: '',
          fileSize: 0,
          sheets: [],
          processingTime: Date.now() - startTime,
          error: 'No file uploaded. Please provide an Excel file.',
        };
        return res.status(400).json(result);
      }

      const sheets = processExcelData(req.file.buffer);

      const result: ExcelProcessResult = {
        success: true,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        sheets,
        processingTime: Date.now() - startTime,
      };

      return res.json(result);

    } catch (error) {
      console.error('Error processing Excel file:', error);
      const result: ExcelProcessResult = {
        success: false,
        fileName: req.file?.originalname || '',
        fileSize: req.file?.size || 0,
        sheets: [],
        processingTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Failed to process Excel file.',
      };
      return res.status(500).json(result);
    }
  });

  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          fileName: '',
          fileSize: 0,
          sheets: [],
          processingTime: 0,
          error: 'File size exceeds the 10MB limit.',
        });
      }
      return res.status(400).json({
        success: false,
        fileName: '',
        fileSize: 0,
        sheets: [],
        processingTime: 0,
        error: err.message,
      });
    }
    
    if (err) {
      return res.status(400).json({
        success: false,
        fileName: '',
        fileSize: 0,
        sheets: [],
        processingTime: 0,
        error: err.message,
      });
    }
    
    next();
  });

  return httpServer;
}
