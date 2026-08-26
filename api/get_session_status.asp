<%@ Language="VBScript" CodePage="65001" %>
<%
Option Explicit

Response.CodePage = 65001
Response.CharSet = "UTF-8"
Response.ContentType = "application/json"
Response.AddHeader "Cache-Control", "no-store, no-cache, must-revalidate"
Response.AddHeader "Pragma", "no-cache"

Dim sessionUserId, isAuthenticated
sessionUserId = Session("userID")
isAuthenticated = False

If Not IsNull(sessionUserId) And Not IsEmpty(sessionUserId) Then
    isAuthenticated = (Len(Trim(CStr(sessionUserId))) > 0)
End If

If isAuthenticated Then
    Response.Write "{""authenticated"":true}"
Else
    Response.Write "{""authenticated"":false}"
End If
%>
