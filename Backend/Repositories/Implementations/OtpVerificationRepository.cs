using System;
using System.Linq;
using System.Threading.Tasks;
using BTech.Data;
using BTech.Models;
using BTech.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace BTech.Repositories.Implementations
{
    public class OtpVerificationRepository : IOtpVerificationRepository
    {
        private readonly ApplicationDbContext _context;

        public OtpVerificationRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task CreateOtpAsync(OtpVerification otpVerification)
        {
            await _context.OtpVerifications.AddAsync(otpVerification);
            await _context.SaveChangesAsync();
        }

        public async Task InvalidatePreviousOtpsAsync(string identifier, string otpType)
        {
            var activeOtps = await _context.OtpVerifications
                .Where(o => o.Identifier == identifier && o.OtpType == otpType && o.Status == 1)
                .ToListAsync();

            foreach (var otp in activeOtps)
            {
                otp.Status = 0; // Inactive
            }

            if (activeOtps.Any())
            {
                await _context.SaveChangesAsync();
            }
        }
    }
}