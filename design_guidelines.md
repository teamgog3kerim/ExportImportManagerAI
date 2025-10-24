# IMPORTS MANAGER - Design Guidelines

## Design Approach: Professional Dashboard System

**Selected Approach**: Design System - Enterprise Dashboard Pattern
**Justification**: This is a data-intensive, productivity-focused application for logistics and finance teams. The design prioritizes information clarity, efficient workflows, and consistent patterns over visual flair. Drawing inspiration from Linear, Asana, and modern SaaS dashboards with shadcn/ui integration.

**Core Design Principles**:
- Information density with breathing room
- Scannable data hierarchies
- Contextual actions always visible
- Real-time status indicators
- Professional credibility through restraint

---

## Typography System

**Font Stack**: 
- **Primary**: Inter (Google Fonts) - Interface text, data tables, forms
- **Monospace**: JetBrains Mono (Google Fonts) - Reference numbers, codes, tracking IDs

**Type Scale**:
- **Page Titles**: text-2xl font-semibold (H1 equivalents)
- **Section Headers**: text-lg font-semibold (Card titles, panel headers)
- **Subsection Headers**: text-base font-medium (Table headers, form sections)
- **Body Text**: text-sm font-normal (Primary content, table data)
- **Supporting Text**: text-xs font-normal (Metadata, timestamps, hints)
- **Data Labels**: text-xs font-medium uppercase tracking-wide (Field labels)

**Line Heights**: Use Tailwind defaults (leading-tight for headings, leading-normal for body)

---

## Layout System

**Spacing Primitives**: Use Tailwind units of **2, 4, 6, 8, 12, 16** consistently throughout
- **Component padding**: p-4, p-6, p-8
- **Element gaps**: gap-2, gap-4, gap-6
- **Section spacing**: mb-6, mb-8, mb-12
- **Tight groupings**: space-y-2, gap-2
- **Generous separation**: space-y-6, gap-8

**Grid Structure**:
- **Main Layout**: Sidebar (240px fixed) + Content Area (flex-1)
- **Content Sections**: max-w-7xl mx-auto with px-6 lg:px-8
- **Dashboard Cards**: Grid with gap-6, responsive columns (grid-cols-1 md:grid-cols-2 lg:grid-cols-3)
- **Data Tables**: Full-width within containers

---

## Component Library

### Navigation Architecture

**Top Header Bar** (h-16, fixed):
- Left: Logo + App Name
- Center: Global search bar (max-w-md)
- Right: Notifications bell + AI Assistant trigger + WhatsApp status + User menu
- Background: Solid with subtle border-b

**Sidebar Navigation** (w-60, fixed left):
- Dashboard overview
- Shipments (with count badge)
- Letters of Credit (LCs)
- Budgets & Finance
- Documents
- Reports & Analytics
- Settings
- Active item highlighted with subtle background
- Collapsible on mobile (hamburger menu)

### Dashboard Cards

**Metric Cards** (Stats overview):
- 3-4 column grid on desktop
- Icon + Label + Large Number + Trend indicator (↑ ↓)
- Subtle hover elevation
- Border with rounded corners (rounded-lg border)

**Data Table Cards**:
- Card wrapper with header (title + action buttons)
- Striped table rows with hover state
- Sticky header on scroll
- Pagination footer
- Row actions (kebab menu on right)
- Status badges using color-coded pills

**Activity Feed Card**:
- Chronological timeline layout
- Avatar + Action description + Timestamp
- Divider lines between items
- "Load more" footer

### Forms & Inputs

**Form Structure**:
- Clear section groupings with dividers
- Label above input pattern
- Helper text below inputs
- Inline validation states (success/error borders + icons)
- Required field indicators (*)

**Input Components** (shadcn/ui patterns):
- Text inputs: border rounded-md with focus:ring states
- Select dropdowns: Custom styled with chevron icons
- Date pickers: Calendar popup component
- File uploads: Drag-and-drop zone with file preview
- Multi-select: Tag-based selection with remove buttons

### Data Displays

**Status Indicators**:
- Shipment Status: Pill badges (In Transit/Arrived/Delayed/Cleared)
- LC Status: Colored dots + text labels (Open/Issued/Confirmed/Closed)
- Budget Health: Progress bars with percentage and color coding
- Document Status: Icon + text combinations

**Tables**:
- Alternating row backgrounds for scannability
- Column headers with sort indicators
- Resizable columns
- Fixed first column for reference IDs
- Expandable rows for detailed information
- Bulk action checkboxes in first column

### Overlays & Modals

**Modal Patterns**:
- Centered overlay with backdrop blur
- Max width constraints (max-w-2xl for forms, max-w-4xl for detailed views)
- Header with title + close button
- Content area with appropriate padding (p-6)
- Footer with action buttons (Cancel + Primary action)

**Slideover Panels** (Details/Chat):
- Right-side slide-in (w-96 to w-1/3)
- For AI Assistant chat interface
- For shipment/LC detail views
- Close on backdrop click or ESI key

**Toast Notifications**:
- Top-right position
- Auto-dismiss after 5 seconds
- Success/Error/Info states with appropriate icons
- Stacked for multiple notifications

### AI Assistant Integration

**Chat Interface** (Slideover):
- Message bubbles (user vs assistant differentiation)
- Timestamp on each message
- Typing indicator for AI responses
- Input field at bottom with send button
- Suggested prompts/quick actions
- Conversation history scrollable

**WhatsApp Integration Panel**:
- Daily summary report preview
- Send schedule configuration
- Recipient management
- Message templates
- Connection status indicator

### Buttons & Actions

**Primary Actions**: Solid background, medium font weight
**Secondary Actions**: Outline style with border
**Destructive Actions**: Red accent for warnings/deletions
**Icon Buttons**: Consistent sizing (h-8 w-8 or h-10 w-10)
**Button Groups**: Connected with shared borders

---

## Responsive Behavior

**Breakpoints**:
- Mobile (< 768px): Stacked layouts, hamburger nav, simplified tables
- Tablet (768px - 1024px): 2-column grids, collapsed sidebar
- Desktop (> 1024px): Full multi-column layouts, persistent sidebar

**Mobile Optimizations**:
- Bottom navigation bar for main sections
- Swipeable cards for data browsing
- Simplified table views (card-based on mobile)
- Full-screen modals instead of centered overlays

---

## Animations

**Purposeful Motion Only**:
- Sidebar expand/collapse: 200ms ease transition
- Modal/slideover entry: 150ms ease-out slide + fade
- Dropdown menus: 100ms ease fade-in
- Loading states: Subtle pulse on skeleton screens
- No decorative animations, hover transitions, or scroll effects

---

## Images & Media

**No Hero Images**: This is a dashboard application - functionality first.

**Iconography**:
- Use **Heroicons** (outline for navigation, solid for status indicators)
- Consistent 20px or 24px sizing
- Status icons: Circle with checkmark, clock, alert, etc.

**Document Previews**:
- PDF thumbnails for uploaded documents
- Image previews for scanned paperwork
- File type icons for other formats

**Empty States**:
- Illustration placeholders for empty tables/lists
- Clear call-to-action to add first item
- Brief explanatory text

---

## Data Visualization

**Budget Tracking**:
- Horizontal progress bars showing utilized vs. allocated
- Color coding: Green (healthy), Yellow (warning), Red (exceeded)
- Stacked bar charts for category breakdowns

**Shipment Timeline**:
- Horizontal timeline with milestone markers
- Current status highlighted
- Estimated dates vs. actual dates comparison

**Analytics Dashboard**:
- Line charts for trends over time
- Bar charts for comparative metrics
- Pie charts for distribution analysis
- Use Chart.js or Recharts library

---

## Accessibility

- Keyboard navigation for all interactive elements
- ARIA labels for icon buttons and status indicators
- Focus visible states on all inputs/buttons
- Sufficient contrast ratios (WCAG AA minimum)
- Screen reader announcements for dynamic updates
- Form validation messages announced to assistive tech

---

## Quality Standards

This design creates a **professional, information-rich dashboard** that balances density with usability. Every component serves the core workflows of import management: tracking shipments, monitoring finances, managing documentation, and staying informed through AI assistance. The design system ensures consistency while remaining flexible for future feature additions.