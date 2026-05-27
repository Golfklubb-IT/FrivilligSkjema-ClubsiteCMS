<%@ Language="VBScript" %>
<%
Option Explicit
Response.ContentType = "application/json"
Response.Charset = "utf-8"

' Hent data postet fra frontend (AJAX/Fetch)
Dim activityId, shiftId, userName, userPhone, userEmail, memberNum

activityId = Request.Form("activityId")
shiftId = Request.Form("shiftId")
userName = Request.Form("name")
userPhone = Request.Form("phone")
userEmail = Request.Form("email")
memberNum = Request.Form("memberNum")

' Her vil den egentlige logikken for å åpne "registrations.json", 
' legge til dette nye objektet, og lagre filen på nytt ligge.
' Ettersom VBScript trenger et eget bibliotek for avansert JSON (som aspon json.asp), 
' simulerer vi foreløpig et vellykket lagrings-svar:

Dim jsonResponse
jsonResponse = "{""status"": ""success"", ""message"": ""Hei " & userName & ", din påmelding er mottatt!""}"

Response.Write jsonResponse
%>