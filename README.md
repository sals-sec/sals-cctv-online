# OEF-25 CCTV Footage Request Tracker

A production-grade React + TypeScript application for managing CCTV Footage Requests (Form OEF-25 Rev 02). Rewritten from dynamic vanilla JavaScript to a modern React SPA using Vite.

## Features

- **Workflow & Sections 01–07**: Full adherence to Form OEF-25 Rev 02:
  - 01: Information (Request Date, Time, Requestor Name, Employee ID, Department, Position, Contact, Email)
  - 02: Purpose (Multiple checkboxes with custom 'Other' specification)
  - 03: Recording Details (Area, Recording Date, automatic day of week, Time range)
  - 04: Footage Request (Format checkboxes and storage media options)
  - 05: Declaration (Confidentiality agreement and typed digital signature)
  - 06: Security Review (Received By, Reviewed By, Footage Availability, Recording Quality)
  - 07: Approval (Approver typed signature, Date, Tracker remarks)
- **Role-Based Access Control**:
  - `admin`: Full administrative control, user creation and management, full request CRUD, default officer configuration.
  - `user (full)`: Full request editing, deletion, and creation of limited accounts.
  - `user (limited)`: Fill and submit new requests, browse register and view previews/PDFs.
- **Tracker & Analytics**:
  - Kinetic Brutalist statistics overview (Total, Submitted, Under Review, Approved, Released, Rejected, Average Days to Approve).
  - Multi-criteria real-time search and filtering (All time, Today, This Week, This Month, Status, Department).
  - Compact table with quick preview drawers for Requestor information and Security Review/Approval status.
- **Document Export & Preview**:
  - Pixel-perfect OEF-25 Statement preview modal with CONFIDENTIAL watermark.
  - In-browser print stylesheet (`@media print`) matching official documentation standards.
  - Client-side PDF generator using `pdf-lib` with exact typography, layout, and watermark.
  - CSV export with UTF-8 BOM encoding and JSON backup/restore capabilities.
- **Theme & System**:
  - Persistent Dark / Light theme toggle.
  - Default Security Officer browser settings.

## Development

```bash
npm install
npm run dev
```

Dev server runs on `http://0.0.0.0:3000`.

## Build

```bash
npm run build
```
