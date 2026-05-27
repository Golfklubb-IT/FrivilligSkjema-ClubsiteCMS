<%@ Language="VBScript" %>
<%
Option Explicit
Response.ContentType = "application/json"
Response.Charset = "utf-8"

Dim fso, filePath, fileContent, stream

' Setter stien til data/activities.json i forhold til denne API-filen
filePath = Server.MapPath("../data/activities.json")

Set fso = Server.CreateObject("Scripting.FileSystemObject")
If fso.FileExists(filePath) Then
    ' Beholder UTF-8 formatering så norske tegn (æøå) ikke knuser
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