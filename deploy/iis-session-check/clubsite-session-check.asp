<%@ Language="VBScript" CodePage="65001" %>
<%
Option Explicit

Response.CodePage = 65001
Response.CharSet = "UTF-8"
Response.ContentType = "text/html"

Dim isLoggedIn, sessionUserId
sessionUserId = Session("userID")
isLoggedIn = False

If Not IsNull(sessionUserId) And Not IsEmpty(sessionUserId) Then
    isLoggedIn = (Len(Trim(CStr(sessionUserId))) > 0)
End If
%>
<!doctype html>
<html lang="no">
<head>
    <meta charset="utf-8">
    <title>Clubsite session test</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 2rem; line-height: 1.5; }
        .ok { color: #146c2e; }
        .warn { color: #9a3412; }
        code { background: #f3f4f6; padding: .15rem .3rem; }
    </style>
</head>
<body>
    <h1>Clubsite session test</h1>
    <% If isLoggedIn Then %>
        <p class="ok"><strong>OK:</strong> En Clubsite-brukersession er tilgjengelig.</p>
        <p><code>Session("userID")</code> finnes. Selve bruker-ID-en vises ikke.</p>
    <% Else %>
        <p class="warn"><strong>IKKE LOGGET INN:</strong> Ingen Clubsite-brukersession ble funnet.</p>
        <p>Logg inn på Clubsite i samme nettleser og last siden på nytt.</p>
    <% End If %>

    <hr>
    <p>Testside for IIS-integrasjon. Fjern filen etter verifisering.</p>
</body>
</html>
