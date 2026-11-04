# Start here — R9 invitation recovery

Build: `cms-backend-20261103-invitation-recovery-r9`.

1. Stop the old API (Visual Studio Shift+F5 or Ctrl+C). Extract into a fresh folder and open Backend/BTech.csproj. Run one backend instance.
2. Keep the supplied frontend unchanged: Pending Invitations and recovery buttons already exist. R9 supplies GET /api/v1/admin/users/invitations and safe duplicate handling.
3. Back up the actual API database and execute Database/AdminManagement/User_Access_Invitation_Recovery_R9.sql there. The supplied dump already has the prerequisites. This repeatable script preserves saved users, colleges, permissions and invitations; its final query shows existing records. Do not import the full dump over live data.
4. User 41 / REC has SMTP_AUTHENTICATE_FAILED recorded. Verify sender credentials in the running API's secrets/environment. Existing Development UserSecretsId BTech-CMS-Backend-2026 is retained. Never put SMTP passwords in source/screenshots.
5. Rebuild/start once; confirm X-CMS-Build equals the R9 marker above. The existing frontend proxy/ngrok must reach that instance's port.
6. First follow ../READ_FIRST.md: run the separate SMTP authentication check, verify the current recipient, and obtain approval before a real test invitation. Then open User Access Management → Pending Invitations → View Invitation → Resend Invitation for the existing account. Do not recreate its college. Duplicate requests return 409 without creating, linking or sending automatically.
7. Verify provider acceptance and inbox receipt separately. Full contracts, SQL instructions, tests, configuration and limitations: INVITATION_RECOVERY_R9_README.md.

Your live database/provider were not changed remotely. Tests used a database copy and controlled SMTP inbox.
