# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Mat89** is a React + TypeScript web application that replaces the legacy Matricula89 Microsoft Access database. It manages repair material shipments and receptions for internal and external destinations, using ReactJS frontend with Supabase backend.

## Commands

### Development
```bash
npm run dev          # Start Vite dev server
npm run build        # TypeScript compilation + production build
npm run lint         # Run ESLint
npm run preview      # Preview production build
```

### Environment Setup
- Requires `.env` file with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Supabase credentials are required for authentication and database access

## Architecture

### Authentication & Authorization
- **Auth provider**: Supabase Auth with email-based authentication
- **Role system**: Three roles stored in `user_profiles` table:
  - `ADMINISTRADOR`: Full CRUD access + user management
  - `EDICION`: Full CRUD access (no user management)
  - `CONSULTAS`: Read-only access to Consultar section
- **Auth utilities**: Located in `src/lib/auth.ts` - use `hasAnyRole()`, `getUserRole()`, `signOut()` for role checks
- **Route protection**: App.tsx handles role-based redirects (CONSULTAS → /consultar, others → /pedidos)

### Database Schema (Supabase)
Core tables:
- `tbl_pedidos_rep`: Orders with fields like num_pedido, proveedor_id, vehiculo, garantia, fecha_envio, estado_pedido
- `tbl_ln_pedidos_rep`: Order lines with matricula_89, descripcion, nenv (quantity sent), nsenv (serial numbers)
- `tbl_recepciones_rep`: Material receptions linked to order lines
- `tbl_proveedores`: Suppliers (internal/external)
- `tbl_materiales`: Materials catalog indexed by matricula_89
- `tbl_historico_cambios`: Change history tracking
- `user_profiles`: User roles and permissions

Database types are auto-generated in `src/lib/database.types.ts` and should be kept in sync with Supabase schema.

### Data Flow
1. **Supabase client**: Initialized in `src/lib/supabase.ts` with environment variables
2. **Data layer**: `src/lib/data.ts` contains CRUD operations for all entities
3. **Type system**: `src/types/index.ts` defines frontend interfaces (Order, OrderLine, Reception, Material, Supplier, ConsultaRecord)
4. **Components**: Page components in `src/pages/`, feature components in `src/components/`

### Key Features Architecture

**Orders (Pedidos)**:
- `OrderForm.tsx`: Handles order creation/editing with material autocomplete
- `MaterialAutocompleteInput.tsx`: Searches materials by matricula_89 with autocomplete
- `MaterialNotFoundModal.tsx`: Allows creating new materials inline
- `OrderList.tsx`: Displays orders with filtering and status tracking
- Order lines track estado_completado based on reception status

**Receptions (Recepciones)**:
- `ReceptionManagement.tsx`: Main component for receiving materials
- Links receptions to order lines, tracks reception status (UTIL, IRREPARABLE, SIN ACTUACION, OTROS)
- Updates order completion status automatically

**Consultar**:
- Aggregates data from orders, order lines, and receptions for comprehensive view
- Type: `ConsultaRecord` combines shipment and reception data

**Export functionality**:
- `excelGenerator.ts` / `excelGenerator_b.ts`: Generate Excel files from order data using xlsx library
- Uses templates from `/public/plantillas/`
- Preserves Excel formatting and cell styles

### UI Components
- Built with Radix UI primitives + Tailwind CSS
- Components in `src/components/ui/` (shadcn/ui pattern)
- Custom styling uses brand color `#91268F` (purple)
- Layout wrapper in `src/components/layout/Layout.tsx` with Sidebar navigation

### Path Aliases
- `@/` maps to `src/` directory (configured in vite.config.ts and tsconfig)
- Always use `@/` imports for internal modules

## Development Guidelines

### Working with Supabase
- All database operations go through `src/lib/data.ts` functions
- Use typed Supabase client from `src/lib/supabase.ts`
- When modifying schema, update migrations in `supabase/migrations/` and regenerate `database.types.ts`

### Adding New Features
1. Define types in `src/types/index.ts`
2. Add data layer functions in `src/lib/data.ts`
3. Create page component in `src/pages/`
4. Add route in `App.tsx` with appropriate role checks
5. Update Sidebar navigation if needed

### Role-Based Access
- Always check user roles before rendering UI or allowing operations
- Use `hasAnyRole(['ADMINISTRADOR', 'EDICION'])` for edit features
- CONSULTAS role should only access read-only views

### State Management
- Uses React hooks (useState, useEffect) for local state
- Toast notifications via `useToast` hook from `src/hooks/use-toast.ts`
- Auth state managed by Supabase onAuthStateChange subscription in App.tsx

### Material Search Pattern
When implementing material search/autocomplete:
- Query `tbl_materiales` by `matricula_89` field
- Provide option to create new material if not found
- Link materials to order lines via `matricula_89` string field

### Working with Dates
- Database stores dates as ISO strings
- Use `date-fns` for date formatting
- `formatDateToDDMMYYYY` utility in `src/lib/utils.ts` for display formatting
