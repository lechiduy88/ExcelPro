# Excel Processor - Web Application

## Overview
A web application that receives HTTP POST requests with Excel files (.xlsx, .xls), processes them (re-indexes ID column starting from 1), and returns either structured JSON data or a processed Excel file.

## Current State
- **Status**: MVP Complete
- **Last Updated**: December 2024

## Project Architecture

### Frontend (React + TypeScript)
- **Location**: `client/src/`
- **Main Page**: `client/src/pages/home.tsx` - File upload interface with drag-and-drop, processing states, and results display
- **Routing**: Uses `wouter` for client-side routing
- **Styling**: Tailwind CSS with shadcn/ui components
- **State Management**: React useState hooks with TanStack Query available

### Backend (Express + TypeScript)
- **Location**: `server/`
- **Routes**: `server/routes.ts` - API endpoints for file upload and processing
- **Entry**: `server/index.ts`

### Shared
- **Location**: `shared/schema.ts` - TypeScript types and Zod schemas

## API Endpoints

### POST /api/upload
Upload and process an Excel file, returns JSON response.

**Request**:
- Content-Type: `multipart/form-data`
- Body: `file` - Excel file (.xlsx, .xls)
- Max file size: 10MB

**Response**:
```json
{
  "success": true,
  "fileName": "example.xlsx",
  "fileSize": 12345,
  "sheets": [
    {
      "name": "Sheet1",
      "rowCount": 100,
      "columnCount": 5,
      "headers": ["ID", "Name", "Value"],
      "data": [
        {"ID": 1, "Name": "Item 1", "Value": 100}
      ]
    }
  ],
  "processingTime": 45
}
```

### POST /api/upload/download
Upload and process an Excel file, returns processed Excel file as download.

**Request**:
- Content-Type: `multipart/form-data`
- Body: `file` - Excel file (.xlsx, .xls)
- Max file size: 10MB

**Response**:
- Content-Type: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- Content-Disposition: `attachment; filename="originalname-processed.xlsx"`
- Body: Binary Excel file with ID column re-indexed from 1

**Usage Example**:
```bash
curl -X POST -F "file=@yourfile.xlsx" -o processed.xlsx \
  https://your-app-url/api/upload/download
```

## Processing Features
- **ID Column Re-indexing**: Columns named "ID", "STT", "No", or "Số thứ tự" are automatically re-numbered starting from 1
- **Multiple Sheets**: All sheets in the workbook are processed
- **Header Detection**: First row is treated as headers

## Key Dependencies
- **xlsx**: Excel file parsing and writing
- **multer**: File upload handling
- **express**: Backend server
- **react**: Frontend framework
- **tailwindcss**: Styling
- **shadcn/ui**: UI components

## Running the Application
The application runs with `npm run dev` which starts both the Express backend and Vite frontend on port 5000.

## File Structure
```
├── client/
│   └── src/
│       ├── pages/
│       │   └── home.tsx       # Main upload page
│       ├── components/ui/     # shadcn UI components
│       └── App.tsx            # App router
├── server/
│   └── routes.ts              # API endpoints
├── shared/
│   └── schema.ts              # Type definitions
└── design_guidelines.md       # Design system documentation
```
