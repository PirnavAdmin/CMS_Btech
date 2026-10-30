using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace BTech.EventManagement;

public static class EventFiles
{
    public const long MaxFileBytes=20*1024*1024;
    public const long MaxRequestBytes=MaxFileBytes+1024*1024;
    public static string Root(IWebHostEnvironment env) => Path.Combine(env.ContentRootPath,"App_Data","EventGallery");
    public static async Task<(byte[] Bytes,string Extension,string Mime,string MediaType)> Read(IFormFile file,CancellationToken ct)
    {
        if(file.Length<=0 || file.Length>MaxFileBytes) throw new EventApiException(400,"Gallery file must be between 1 byte and 20 MB.");
        await using var input=file.OpenReadStream();using var output=new MemoryStream();
        var buffer=new byte[81920];int read;
        while((read=await input.ReadAsync(buffer.AsMemory(),ct))>0)
        {
            if(output.Length+read>MaxFileBytes) throw new EventApiException(400,"Gallery file exceeds 20 MB.");
            await output.WriteAsync(buffer.AsMemory(0,read),ct);
        }
        var bytes=output.ToArray();var ext=Path.GetExtension(file.FileName).ToLowerInvariant();
        string mime,type;
        if((ext is ".jpg" or ".jpeg") && bytes.Length>=4 && bytes[0]==0xff && bytes[1]==0xd8 && bytes[2]==0xff)
        { ext=".jpg";mime="image/jpeg";type="IMAGE"; }
        else if(ext==".png" && bytes.Length>=24 && bytes.AsSpan(0,8).SequenceEqual(new byte[]{137,80,78,71,13,10,26,10}))
        { mime="image/png";type="IMAGE"; }
        else if(ext==".webp" && bytes.Length>=16 && Encoding.ASCII.GetString(bytes,0,4)=="RIFF" && Encoding.ASCII.GetString(bytes,8,4)=="WEBP")
        { mime="image/webp";type="IMAGE"; }
        else if(ext==".mp4" && bytes.Length>=16 && Encoding.ASCII.GetString(bytes,4,4)=="ftyp")
        { mime="video/mp4";type="VIDEO"; }
        else throw new EventApiException(400,"Upload a JPG, PNG, WEBP or MP4 with a matching file signature.");
        if(!string.Equals(file.ContentType,mime,StringComparison.OrdinalIgnoreCase)) throw new EventApiException(400,"File content type does not match its format.");
        return (bytes,ext,mime,type);
    }
    public static string Resolve(IWebHostEnvironment env,string stored)
    {
        if(!Regex.IsMatch(stored,@"\A[a-f0-9]{32}\.(jpg|png|webp|mp4)\z",RegexOptions.CultureInvariant))
            throw new EventApiException(404,"Gallery file is unavailable through the protected file store.");
        var path=Path.Combine(Root(env),stored);
        if(!File.Exists(path)) throw new EventApiException(404,"Gallery file does not exist on this server.");
        return path;
    }
}

/// <summary>Small PDF renderer without extra NuGet dependencies. Uses built-in Helvetica.</summary>
public static class EventPdf
{
    public static byte[] Create(string title,string recipient,string eventName,string number,string token,DateTime issued)
    {
        static string Escape(string s) => new string(s.Select(c=>c is >= ' ' and <= '~'?c:'?').ToArray()).Replace("\\","\\\\").Replace("(","\\(").Replace(")","\\)");
        var content=new StringBuilder("0.15 0.25 0.45 RG 3 w 35 35 772 525 re S\n0.1 0.1 0.1 rg\n");
        void Line(string text,int y,int font=16) => content.Append("BT /F1 ").Append(font).Append(" Tf 60 ").Append(y).Append(" Td (").Append(Escape(text)).Append(") Tj ET\n");
        int[] widths={278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584};
        List<string> Wrap(string text,int font)
        {
            var lines=new List<string>();var line=new StringBuilder();double length=0;
            foreach(char raw in text)
            {
                char c=raw is >= ' ' and <= '~'?raw:'?';double size=widths[c-32]*font/1000.0;
                if(length+size>720 && line.Length>0) {lines.Add(line.ToString());line.Clear();length=0;}
                line.Append(c);length+=size;
            }
            if(line.Length>0) lines.Add(line.ToString());return lines;
        }
        void Wrapped(string text,ref int y,int font,int maxLines)
        {
            var lines=Wrap(text,font);
            while(lines.Count>maxLines && font>8) {font--;lines=Wrap(text,font);}
            foreach(var line in lines) {Line(line,y,font);y-=24;}
        }
        Line("CERTIFICATE",500,28);int y=462;Wrapped(title,ref y,18,4);
        y-=20;Line("This certificate is awarded to",y);y-=30;Wrapped(recipient,ref y,20,3);
        y-=15;Line("For participation / achievement in",y);y-=27;Wrapped(eventName,ref y,16,3);
        Line("Certificate No: "+number,125,11);
        Line("Issued: "+issued.ToString("yyyy-MM-dd HH:mm",CultureInfo.InvariantCulture)+" (college local time)",103,11);
        Line("Verification token: "+token,81,10);
        var stream=Encoding.ASCII.GetBytes(content.ToString());
        var objects=new[]{"<< /Type /Catalog /Pages 2 0 R >>","<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
            "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
            "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
            "<< /Length "+stream.Length+" >>\nstream\n"+Encoding.ASCII.GetString(stream)+"endstream"};
        using var pdf=new MemoryStream();void Write(string text) { var b=Encoding.ASCII.GetBytes(text);pdf.Write(b); }
        Write("%PDF-1.4\n");var offsets=new List<long>{0};
        for(int i=0;i<objects.Length;i++) { offsets.Add(pdf.Position);Write($"{i+1} 0 obj\n{objects[i]}\nendobj\n"); }
        long xref=pdf.Position;Write("xref\n0 6\n0000000000 65535 f \n");
        foreach(var offset in offsets.Skip(1)) Write(offset.ToString("D10",CultureInfo.InvariantCulture)+" 00000 n \n");
        Write($"trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n");return pdf.ToArray();
    }
}
