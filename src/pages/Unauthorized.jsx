import { Link } from 'react-router-dom'
export default function Unauthorized() { return <main className="message-page"><h1>Unauthorized</h1><p>You do not have permission to view this page.</p><Link to="/dashboard">Return to dashboard</Link></main> }
