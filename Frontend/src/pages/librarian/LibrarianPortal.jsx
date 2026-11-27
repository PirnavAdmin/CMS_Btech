import { Navigate, useParams } from 'react-router-dom'
import LibraryWorkspace from '../../pages/campus/LibraryWorkspace.jsx'
import LibrarianPortalLayout from './LibrarianPortalLayout.jsx'
import LibrarianLocalWorkspace from './LibrarianLocalWorkspace.jsx'

const serviceScreens = new Set(['dashboard', 'all-books', 'add-book', 'issue-books', 'return-books', 'renew-books', 'issued-books', 'members', 'student-accounts', 'member-history', 'pending-fines', 'paid-fines', 'reports', 'overdue-report', 'member-activity', 'most-borrowed'])
const localScreens = new Set(['book-categories', 'authors-publishers', 'book-copies', 'reservations', 'inventory', 'damaged-books', 'lost-books', 'stock-verification', 'fine-rules', 'notifications', 'settings', 'profile', 'faculty-accounts'])
const labels = { dashboard: 'Dashboard', 'all-books': 'All Books', 'add-book': 'Add New Book', 'issue-books': 'Issue Books', 'return-books': 'Return Books', 'renew-books': 'Renew Books', 'issued-books': 'Issued Books', members: 'All Members', 'student-accounts': 'Student Library Accounts', 'faculty-accounts': 'Faculty Library Accounts', 'member-history': 'Member History', 'pending-fines': 'Pending Fines', 'paid-fines': 'Paid Fines', 'fine-rules': 'Fine Rules', inventory: 'Inventory Management', 'book-copies': 'Book Copies / Stock', 'book-categories': 'Book Categories', 'authors-publishers': 'Authors & Publishers', reservations: 'Reservation Requests', 'damaged-books': 'Damaged Books', 'lost-books': 'Lost Books', 'stock-verification': 'Stock Verification', reports: 'Reports & Analytics', 'overdue-report': 'Overdue Books Report', 'member-activity': 'Member Activity', 'most-borrowed': 'Most Borrowed Books', notifications: 'Notifications', settings: 'Library Settings', profile: 'My Profile' }

export default function LibrarianPortal({ basePath = '/faculty-portal' }) {
  const { screen = 'dashboard' } = useParams()
  if (!serviceScreens.has(screen) && !localScreens.has(screen)) return <Navigate to={`${basePath}/dashboard`} replace />
  const title = labels[screen]
  return <LibrarianPortalLayout title={title} basePath={basePath}>
    {serviceScreens.has(screen) ? <LibraryWorkspace key={screen} portalScreen={screen} /> : <LibrarianLocalWorkspace key={screen} screen={screen} />}
  </LibrarianPortalLayout>
}
