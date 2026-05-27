<%@ Language="VBScript" %>
<%
Option Explicit
Response.ContentType = "application/json"
Response.Charset = "utf-8"

Dim fso, filePath, fileContent, stream

filePath = Server.MapPath("../data/registrations.json")

Set fso = Server.CreateObject("Scripting.FileSystemObject")
If fso.FileExists(filePath) Then
    Set stream = Server.CreateObject("ADODB.Stream")
    stream.CharSet = "utf-8"
    stream.Open
    stream.LoadFromFile(filePath)
    
    fileContent = stream.ReadText()
    stream.Close
    Set stream = Nothing
    
    Response.Write fileContent
Else
    Response.Write "[]"
End If

Set fso = Nothing
%>