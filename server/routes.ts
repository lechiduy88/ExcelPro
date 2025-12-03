import type { Express } from "express";
import type { Server } from "http";
import multer from "multer";
import * as XLSX from "xlsx";
import ExcelJS from "exceljs";

// Cấu hình multer để lưu file vào memory
const upload = multer({ storage: multer.memoryStorage() });

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // API endpoint để xử lý file Excel
  app.post("/api/excel/process", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Không có file được upload" });
      }

      console.log("File received:", req.file.originalname, "Size:", req.file.size);

      // Đọc file Excel từ buffer bằng XLSX
      const xlsxWorkbook = XLSX.read(req.file.buffer, { type: "buffer" });
      
      // Chuyển sang ExcelJS để định dạng
      const workbook = new ExcelJS.Workbook();
      
      // Xử lý từng sheet
      for (const sheetName of xlsxWorkbook.SheetNames) {
        const xlsxSheet = xlsxWorkbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(xlsxSheet, { header: 1 });
        
        // Tạo worksheet mới trong ExcelJS
        const worksheet = workbook.addWorksheet(sheetName);
        
        // Thêm dữ liệu vào worksheet
        jsonData.forEach((row: any, index: number) => {
          worksheet.addRow(row);
        });
      }

      // Xử lý và định dạng Excel
      workbook.eachSheet((worksheet) => {
        // Đổi cột A (ID) thành STT và đánh số tự động
        const firstCell = worksheet.getCell("A1");
        if (firstCell.value?.toString().toLowerCase().includes("id")) {
          firstCell.value = "STT";
          
          // Đánh số từ 1, 2, 3... cho các dòng dữ liệu
          let sttCounter = 1;
          worksheet.eachRow((row, rowNumber) => {
            if (rowNumber > 1) {
              row.getCell(1).value = sttCounter++;
              row.getCell(1).alignment = { vertical: "middle", horizontal: "center" };
            }
          });
        }

        // Định dạng header (dòng đầu tiên)
        const headerRow = worksheet.getRow(1);
        headerRow.font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } };
        headerRow.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF4472C4" },
        };
        headerRow.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
        headerRow.height = 30;

        // Tự động điều chỉnh độ rộng cột
        worksheet.columns.forEach((column) => {
          let maxLength = 0;
          column.eachCell?.({ includeEmpty: true }, (cell) => {
            const cellValue = cell.value?.toString() || "";
            maxLength = Math.max(maxLength, cellValue.length);
          });
          column.width = Math.min(Math.max(maxLength + 2, 10), 50);
        });

        // Định dạng các dòng dữ liệu
        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber > 1) {
            row.eachCell((cell, colNumber) => {
              cell.border = {
                top: { style: "thin" },
                left: { style: "thin" },
                bottom: { style: "thin" },
                right: { style: "thin" },
              };
              cell.alignment = { vertical: "middle", horizontal: "left" };
              
              // Cột A (STT): Căn giữa
              if (colNumber === 1) {
              cell.alignment = { vertical: "middle", horizontal: "center" };
              }          
              
              // Cột B, C, D (2, 3, 4): Wrap text
              if (colNumber >= 2 && colNumber <= 4) {
                cell.alignment = { 
                  vertical: "middle", 
                  horizontal: "left",
                  wrapText: true 
                };
              }
              
              // Cột E (5): Căn giữa
              if (colNumber === 5) {
                cell.alignment = { vertical: "middle", horizontal: "center" };
              }
              
              // Cột F, G (6, 7): Căn cứ pháp lý - Tách text và link
              if (colNumber === 6 || colNumber === 7) {
                const cellValue = cell.value?.toString() || "";
                cell.alignment = { 
                  vertical: "middle", 
                  horizontal: "left",
                  wrapText: true 
                };
                
                // Tìm URL trong chuỗi (bắt đầu bằng http)
                const httpIndex = cellValue.indexOf("http");
                if (httpIndex !== -1) {
                  // Tách text (trước http) và link (từ http đến hết)
                  const text = cellValue.substring(0, httpIndex).trim();
                  const link = cellValue.substring(httpIndex).trim();
                  
                  if (text && link) {
                    // Tạo hyperlink
                    cell.value = {
                      text: text,
                      hyperlink: link,
                      tooltip: link
                    };
                    cell.font = { color: { argb: "FF0000FF" }, underline: true };
                  }
                }
              }
            });

            // Màu xen kẽ cho các dòng
            if (rowNumber % 2 === 0) {
              row.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FFF2F2F2" },
              };
            }
          }
        });

        // Thêm border cho header
        headerRow.eachCell((cell) => {
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };
        });
      });

      // Tạo buffer từ workbook đã định dạng
      const outputBuffer = await workbook.xlsx.writeBuffer();
      console.log("Output buffer size:", outputBuffer.byteLength);

      // Tạo tên file với format: "Tổng hợp thông tin pháp luật mới YYYYMMDD.xlsx"
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const dateStr = `${year}${month}${day}`;
      const filename = `Tong hop thong tin phap luat moi ${dateStr}.xlsx`;

      // Trả về file Excel đã định dạng
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${encodeURIComponent(filename)}"`
      );
      
      // Gửi buffer trực tiếp
      res.send(Buffer.from(outputBuffer));
    } catch (error) {
      console.error("Lỗi xử lý file Excel:", error);
      res.status(500).json({ message: "Lỗi xử lý file Excel" });
    }
  });
  
  return httpServer;
}
