<%@ Language="VBScript" %>
<%
Option Explicit
Response.ContentType = "application/json"
Response.Charset = "utf-8"

Dim title, message, url, payload, http
title = Request.Form("title")
message = Request.Form("message")

' Sikkerhet/validering
If title = "" Or message = "" Then
    Response.Write "{""status"": ""error"", ""message"": ""Mangler tittel eller beskjed.""}"
    Response.End
End If

' OneSignal Konfigurasjon - Fyll inn disse nøklene fra OneSignal.com!
Dim oneSignalAppId, restApiKey
oneSignalAppId = "SETT_INN_ONESIGNAL_APP_ID_HER"
restApiKey = "SETT_INN_ONESIGNAL_REST_API_KEY_HER"

' Sett opp OneSignal POST url
url = "https://onesignal.com/api/v1/notifications"

' Bygg et veldig simpelt JSON-payload rent som streng
' Eskalerer anførselstegn ved å doble dem ("")
payload = "{" & _
    """app_id"": """ & oneSignalAppId & """, " & _
    """included_segments"": [""Total Subscriptions""], " & _
    """headings"": {""en"": """ & title & """}, " & _
    """contents"": {""en"": """ & message & """}" & _
"}"

' Bruker Windows serverens innebygde objekt for HTTP requests
On Error Resume Next
Set http = Server.CreateObject("MSXML2.ServerXMLHTTP.6.0")
http.Open "POST", url, False
http.setRequestHeader "Content-Type", "application/json; charset=utf-8"
http.setRequestHeader "Authorization", "Basic " & restApiKey
http.send payload

If Err.Number <> 0 Then
    Response.Write "{""status"": ""error"", ""message"": ""Server feil: Kunne ikke kontakte OneSignal.""}"
    Err.Clear
Else
    ' Enkelt parsing av svar for å se om det gikk
    Dim responseText
    responseText = http.responseText
    If InStr(responseText, "errors") > 0 Then
        Response.Write "{""status"": ""error"", ""message"": ""OneSignal rapporterte feil med nøklene.""}"
    Else
        Response.Write "{""status"": ""success"", ""message"": ""Varselet ble sendt til alle app-brukere!""}"
    End If
End If

Set http = Nothing
%>