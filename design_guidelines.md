# Design Guidelines: Excel File Processing Web Application

## Design Approach
**System-Based Approach**: Material Design principles for a clean, functional utility application focused on efficiency and clarity.

**Justification**: This is a utility-focused tool where task completion and data visibility are paramount. Material Design provides excellent patterns for file uploads, progress indicators, and data tables.

## Layout System
**Spacing Units**: Tailwind units of 2, 4, 6, and 8 (p-2, m-4, gap-6, py-8)
- Tight spacing (2-4) for related elements
- Medium spacing (6-8) for section separation
- Consistent padding: p-6 for cards, p-8 for containers

**Container Strategy**:
- Main app container: max-w-4xl mx-auto (centered, focused workspace)
- Full-width results table: max-w-6xl when data is displayed
- Vertical rhythm: py-8 between major sections

## Typography
**Font Family**: 
- Primary: Inter (Google Fonts) - clean, professional, excellent for data
- Monospace: JetBrains Mono - for displaying raw data/JSON

**Hierarchy**:
- Page title: text-3xl font-bold
- Section headers: text-xl font-semibold
- Body text: text-base
- Helper text/labels: text-sm text-gray-600
- Data values: text-sm font-mono

## Core Components

**File Upload Zone**:
- Large dropzone area (min-h-64) with dashed border
- Center-aligned icon (document/upload icon from Heroicons)
- Clear upload instructions and accepted formats (.xlsx, .xls)
- Drag-and-drop functionality with visual feedback
- Selected file display with filename, size, and remove option
- Upload button: Primary, prominent (text-base font-semibold)

**Processing State**:
- Linear progress bar with percentage
- Processing status message (text-center)
- Animated spinner icon during processing
- Estimated time remaining if applicable

**Results Display**:
- Tabbed interface if multiple sheets exist (tabs at top)
- Data table with alternating row backgrounds for readability
- Fixed header row when scrolling
- Column headers: font-semibold, slightly elevated background
- Pagination controls if data exceeds screen height
- Download results button (secondary style)

**Response Summary Card**:
- Compact card above results table
- Shows: rows processed, columns found, processing time
- Success/error indicators with appropriate icons

**Error States**:
- Alert banner for upload/processing errors
- Clear error messages with actionable guidance
- Option to retry or upload different file

## Navigation
**Header** (sticky top):
- Application title/logo (left)
- Simple nav if needed: Documentation, API Info (right)
- Height: h-16, shadow-sm for subtle elevation

**Footer**:
- Minimal: API endpoint info, supported formats
- Links: Documentation, GitHub (if applicable)
- py-6, text-center, text-sm

## Interaction Patterns
- Immediate visual feedback on all actions
- Disable upload button while processing
- Toast notifications for successful uploads
- Keyboard shortcuts: Ctrl+U to upload, Esc to clear

## Images
**No hero image needed** - This is a functional tool, not a marketing page. Focus on the upload interface immediately.

If desired for branding:
- Small header logo/wordmark only (h-8)
- Background pattern: Subtle grid or geometric pattern in upload zone (very low opacity)

## Component Layout Structure

**Single Page Layout**:
1. Header (h-16)
2. Main Container (max-w-4xl, py-8)
   - Upload section with dropzone
   - OR Processing state (when active)
   - OR Results section (when complete)
3. Footer (py-6)

**Upload State** (default):
- Centered dropzone with clear CTAs
- File format information below
- Example API request snippet (collapsible)

**Results State**:
- Summary card (mb-6)
- Data table or JSON viewer
- Action buttons: Download, Upload New File

## Accessibility
- ARIA labels for file input and upload zone
- Keyboard navigation for all interactions
- Screen reader announcements for processing states
- High contrast ratios for text and data

## Performance Considerations
- Virtualized table rows for large datasets
- Lazy load table data if exceeding 1000 rows
- Progress streaming for upload feedback