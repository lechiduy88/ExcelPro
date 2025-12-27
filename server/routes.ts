import type { Express } from "express";
import type { Server } from "http";
import multer from "multer";
import * as XLSX from "xlsx";
import ExcelJS from "exceljs";

// Cấu hình multer để lưu file vào memory - hỗ trợ nhiều file
const upload = multer({ storage: multer.memoryStorage() });

// Mapping tiêu đề song ngữ Việt - Trung (phồn thể)
const BILINGUAL_HEADERS: { [key: string]: string } = {
  "ID": "STT\n序號",
  "Nội dung quy định": "Nội dung quy định\n規定內容",
  "Quy định cũ": "Quy định cũ\n舊規定",
  "Quy định mới": "Quy định mới\n新規定",
  "Thay đổi": "Thay đổi\n變更",
  "Căn cứ pháp lý cũ": "Căn cứ pháp lý cũ\n舊法律依據",
  "Căn cứ pháp lý mới": "Căn cứ pháp lý mới\n新法律依據",
};

// Hàm chuyển đổi header sang song ngữ
function getBilingualHeader(header: string): string {
  return BILINGUAL_HEADERS[header] || header;
}

// Hàm kiểm tra text có phải tiếng Trung không
function isChinese(text: string): boolean {
  // Kiểm tra có ký tự Trung Quốc không (CJK Unified Ideographs)
  return /[\u4e00-\u9fff]/.test(text);
}

// Hàm nhóm và sắp xếp data theo ID (Việt trước, Trung sau)
function groupAndSortByID(data: any[]): { sortedData: any[], idGroups: Map<any, number[]>, chineseRows: Set<number> } {
  // Nhóm theo ID
  const groups = new Map<any, any[]>();
  
  for (const row of data) {
    const id = row.ID;
    if (!groups.has(id)) {
      groups.set(id, []);
    }
    groups.get(id)!.push(row);
  }
  
  // Sắp xếp mỗi nhóm: tiếng Việt trước, tiếng Trung sau
  const sortedData: any[] = [];
  const idGroups = new Map<any, number[]>(); // Map ID -> [startRowIndex, endRowIndex]
  const chineseRows = new Set<number>(); // Set chứa index của các dòng tiếng Trung
  
  // Lấy các ID theo thứ tự xuất hiện đầu tiên
  const uniqueIDs: any[] = [];
  for (const row of data) {
    if (!uniqueIDs.includes(row.ID)) {
      uniqueIDs.push(row.ID);
    }
  }
  
  for (const id of uniqueIDs) {
    const group = groups.get(id)!;
    const startIndex = sortedData.length;
    
    // Sắp xếp: không phải tiếng Trung (Việt) trước, tiếng Trung sau
    const sorted = group.sort((a, b) => {
      const aIsChinese = isChinese(JSON.stringify(a));
      const bIsChinese = isChinese(JSON.stringify(b));
      if (aIsChinese && !bIsChinese) return 1;
      if (!aIsChinese && bIsChinese) return -1;
      return 0;
    });
    
    // Đánh dấu các dòng tiếng Trung
    for (const row of sorted) {
      const currentIndex = sortedData.length;
      if (isChinese(JSON.stringify(row))) {
        chineseRows.add(currentIndex);
      }
      sortedData.push(row);
    }
    
    idGroups.set(id, [startIndex, sortedData.length - 1]);
  }
  
  return { sortedData, idGroups, chineseRows };
}

// Hàm format worksheet chung - chỉ format đến cột G (7 cột)
function formatWorksheet(worksheet: ExcelJS.Worksheet, idGroups?: Map<any, number[]>, chineseRows?: Set<number>) {
  const MAX_COL = 7; // Chỉ format đến cột G
  const CHINESE_TEXT_COLOR = "FF0066CC"; // Màu xanh dương cho tiếng Trung
  
  // Đổi cột A thành STT song ngữ và đánh số theo nhóm + merge cells
  const firstCell = worksheet.getCell("A1");
  const firstCellValue = firstCell.value?.toString().toLowerCase() || "";
  if (firstCellValue.includes("id") || firstCellValue.includes("stt") || firstCellValue.includes("序號")) {
    firstCell.value = "STT\n序號";
    
    if (idGroups && idGroups.size > 0) {
      // Đánh số theo nhóm ID và merge cells
      let sttCounter = 1;
      const entries = Array.from(idGroups.entries());
      for (const [, [startIdx, endIdx]] of entries) {
        const startRowNum = startIdx + 2; // +2 vì header ở row 1
        const endRowNum = endIdx + 2;
        
        // Đặt giá trị STT ở dòng đầu tiên của nhóm
        const firstRowCell = worksheet.getCell(`A${startRowNum}`);
        firstRowCell.value = sttCounter;
        firstRowCell.alignment = { vertical: "middle", horizontal: "center" };
        
        // Merge cells nếu nhóm có nhiều hơn 1 dòng
        if (endRowNum > startRowNum) {
          worksheet.mergeCells(`A${startRowNum}:A${endRowNum}`);
        }
        
        sttCounter++;
      }
    } else {
      let sttCounter = 1;
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
          row.getCell(1).value = sttCounter++;
          row.getCell(1).alignment = { vertical: "middle", horizontal: "center" };
        }
      });
    }
  }

  // Định dạng header - chỉ từ cột A đến G
  const headerRow = worksheet.getRow(1);
  headerRow.height = 45; // Tăng chiều cao để chứa 2 dòng (Việt + Trung)
  for (let col = 1; col <= MAX_COL; col++) {
    const cell = headerRow.getCell(col);
    cell.font = { bold: true, size: 12, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4472C4" },
    };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  }

  // Tự động điều chỉnh độ rộng cột (chỉ đến cột G)
  for (let col = 1; col <= MAX_COL; col++) {
    const column = worksheet.getColumn(col);
    let maxLength = 0;
    column.eachCell?.({ includeEmpty: true }, (cell) => {
      const cellValue = cell.value?.toString() || "";
      maxLength = Math.max(maxLength, cellValue.length);
    });
    let width = Math.min(Math.max(maxLength + 2, 10), 50);
    
    // Cột E (Thay đổi) - tăng rộng x1.5
    if (col === 5) {
      width = Math.round(width * 1.5);
    }
    
    column.width = width;
  }

  // Tính toán màu xen kẽ theo nhóm ID
  const groupColors = new Map<number, string>(); // rowNumber -> color
  if (idGroups && idGroups.size > 0) {
    let groupIndex = 0;
    const entries = Array.from(idGroups.entries());
    for (const [, [startIdx, endIdx]] of entries) {
      const color = groupIndex % 2 === 0 ? "" : "FFF2F2F2"; // Xen kẽ theo nhóm
      for (let i = startIdx; i <= endIdx; i++) {
        const rowNum = i + 2;
        if (color) groupColors.set(rowNum, color);
      }
      groupIndex++;
    }
  }

  // Định dạng các dòng dữ liệu - chỉ từ cột A đến G
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      const dataIndex = rowNumber - 2; // Index trong data (0-based)
      const isChineseRow = chineseRows?.has(dataIndex) || false;
      
      for (let colNumber = 1; colNumber <= MAX_COL; colNumber++) {
        const cell = row.getCell(colNumber);
        
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
        cell.alignment = { vertical: "middle", horizontal: "left" };
        
        // Màu chữ xanh dương cho dòng tiếng Trung (trừ cột STT đã merge)
        if (isChineseRow && colNumber > 1) {
          cell.font = { color: { argb: CHINESE_TEXT_COLOR } };
        }
        
        if (colNumber === 1) {
          cell.alignment = { vertical: "middle", horizontal: "center" };
        }
        
        if (colNumber >= 2 && colNumber <= 4) {
          cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
        }
        
        if (colNumber === 5) {
          cell.alignment = { vertical: "middle", horizontal: "center" };
          if (isChineseRow) {
            cell.font = { color: { argb: CHINESE_TEXT_COLOR } };
          }
        }
        
        if (colNumber === 6 || colNumber === 7) {
          const cellValue = cell.value?.toString() || "";
          cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
          
          const httpIndex = cellValue.indexOf("http");
          if (httpIndex !== -1) {
            const text = cellValue.substring(0, httpIndex).trim();
            const link = cellValue.substring(httpIndex).trim();
            
            if (text && link) {
              cell.value = { text: text, hyperlink: link, tooltip: link };
              // Hyperlink vẫn giữ màu xanh đậm và underline
              cell.font = { color: { argb: "FF0000FF" }, underline: true };
            }
          } else if (isChineseRow) {
            cell.font = { color: { argb: CHINESE_TEXT_COLOR } };
          }
        }
        
        // Màu xen kẽ theo nhóm hoặc theo dòng
        if (idGroups && idGroups.size > 0) {
          const color = groupColors.get(rowNumber);
          if (color) {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: color } };
          }
        } else if (rowNumber % 2 === 0) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2F2F2" } };
        }
      }
    }
  });
}

// Hàm tạo tên file output
function getOutputFilename(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `Tong hop thong tin phap luat moi ${year}${month}${day}.xlsx`;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // API 1: Xử lý nhiều file Excel - gộp thành nhiều sheet
  app.post("/api/excel/process", upload.array("files", 10), async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      
      if (!files || files.length === 0) {
        return res.status(400).json({ message: "Không có file được upload" });
      }

      console.log(`Received ${files.length} file(s)`);
      
      const sheetNames = req.body.sheetNames 
        ? (Array.isArray(req.body.sheetNames) ? req.body.sheetNames : [req.body.sheetNames])
        : [];

      const workbook = new ExcelJS.Workbook();
      
      for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
        const file = files[fileIndex];
        console.log(`Processing file ${fileIndex + 1}:`, file.originalname);
        
        const xlsxWorkbook = XLSX.read(file.buffer, { type: "buffer" });
        
        for (const originalSheetName of xlsxWorkbook.SheetNames) {
          const xlsxSheet = xlsxWorkbook.Sheets[originalSheetName];
          const jsonData = XLSX.utils.sheet_to_json(xlsxSheet, { header: 1 });
          
          let newSheetName = sheetNames[fileIndex] 
            || (files.length > 1 ? file.originalname.replace(/\.[^/.]+$/, "") : originalSheetName);
          
          let finalSheetName = newSheetName;
          let counter = 1;
          while (workbook.getWorksheet(finalSheetName)) {
            finalSheetName = `${newSheetName}_${counter++}`;
          }
          
          const worksheet = workbook.addWorksheet(finalSheetName);
          jsonData.forEach((row: any) => worksheet.addRow(row));
        }
      }

      workbook.eachSheet((worksheet) => formatWorksheet(worksheet));

      const outputBuffer = await workbook.xlsx.writeBuffer();
      
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(getOutputFilename())}"`);
      res.send(Buffer.from(outputBuffer));
    } catch (error) {
      console.error("Lỗi xử lý file Excel:", error);
      res.status(500).json({ message: "Lỗi xử lý file Excel" });
    }
  });

  // API 2: Tạo Excel từ JSON - hỗ trợ nhiều format
  // Format 1: Array trực tiếp: [{...}, {...}] -> 1 sheet "Sheet1"
  // Format 2: Object với sheets: { sheets: [{ name, data }] }
  // Format 3: Object với key là tên sheet: { "Sheet1": [...], "Sheet2": [...] }
  app.post("/api/excel/create", async (req, res) => {
    try {
      const body = req.body;
      const workbook = new ExcelJS.Workbook();
      
      // Helper function để thêm data vào worksheet (chỉ lấy 7 cột đầu: A-G)
      const addDataToWorksheet = (sheetName: string, data: any[]) => {
        if (!Array.isArray(data) || data.length === 0) return;
        
        // Nhóm và sắp xếp theo ID (Việt trước, Trung sau)
        const { sortedData, idGroups, chineseRows } = groupAndSortByID(data);
        
        // Chỉ lấy tối đa 7 cột đầu tiên (A-G)
        const allHeaders = Object.keys(sortedData[0]);
        const headers = allHeaders.slice(0, 7);
        
        // Chuyển đổi sang tiêu đề song ngữ
        const bilingualHeaders = headers.map(h => getBilingualHeader(h));
        
        const worksheet = workbook.addWorksheet(sheetName);
        
        worksheet.addRow(bilingualHeaders);
        for (const row of sortedData) {
          worksheet.addRow(headers.map((h: string) => row[h] ?? ""));
        }
        
        formatWorksheet(worksheet, idGroups, chineseRows);
      };

      // Format 1: Body là array trực tiếp [{...}, {...}]
      if (Array.isArray(body)) {
        console.log("Format 1: Direct array");
        addDataToWorksheet("Sheet1", body);
      }
      // Format 2: { sheets: [{ name, data }] }
      else if (body.sheets && Array.isArray(body.sheets)) {
        console.log("Format 2: sheets array");
        for (const sheet of body.sheets) {
          const sheetName = sheet.name || `Sheet${workbook.worksheets.length + 1}`;
          let data = sheet.data;
          
          if (typeof data === "string") {
            data = JSON.parse(data);
          }
          
          addDataToWorksheet(sheetName, data);
        }
      }
      // Format 3: { "SheetName1": [...], "SheetName2": [...] }
      else if (typeof body === "object") {
        console.log("Format 3: Object with sheet names as keys");
        for (const [sheetName, jsonData] of Object.entries(body)) {
          let data: any[] = [];
          
          if (typeof jsonData === "string") {
            data = JSON.parse(jsonData);
          } else if (Array.isArray(jsonData)) {
            data = jsonData;
          }
          
          addDataToWorksheet(sheetName, data);
        }
      }

      if (workbook.worksheets.length === 0) {
        return res.status(400).json({ message: "Không có dữ liệu hợp lệ để tạo Excel" });
      }

      console.log(`Created Excel with ${workbook.worksheets.length} sheet(s)`);
      
      const outputBuffer = await workbook.xlsx.writeBuffer();
      
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(getOutputFilename())}"`);
      res.send(Buffer.from(outputBuffer));
    } catch (error) {
      console.error("Lỗi tạo file Excel:", error);
      res.status(500).json({ message: "Lỗi tạo file Excel" });
    }
  });

  return httpServer;
}
