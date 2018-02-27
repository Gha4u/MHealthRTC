
var selfEasyrtcid = "";
var haveSelfVideo = false;

function disable(domId) {
    document.getElementById(domId).disabled = "disabled";
}


function enable(domId) {
    document.getElementById(domId).disabled = "";
}

var onceOnly = true;


function connect() {


    easyrtc.enableAudio(document.getElementById("shareAudio").checked);
    easyrtc.enableVideo(document.getElementById("shareVideo").checked);
    easyrtc.enableDataChannels(true);
    easyrtc.setPeerListener(addToConversation);
    easyrtc.setRoomOccupantListener(convertListToButtons);
    easyrtc.connect("easyrtc.audioVideo",loginSuccess, loginFailure);
    easyrtc.connect("easyrtc.instantMessaging",loginSuccess, loginFailure);
    if( onceOnly ) {
        easyrtc.getAudioSinkList( function(list) {
            for(let ele of list ) {
                addSinkButton(ele.label, ele.deviceId);
            }
        });
        onceOnly = false;
    }

}


function addSinkButton(label, deviceId){
    let button = document.createElement("button");
    button.innerText = label?label:deviceId;
    button.onclick = function() {
        easyrtc.setAudioOutput( document.getElementById("callerVideo"), deviceId);
    }
    document.getElementById("audioSinkButtons").appendChild(button);
}


function hangup() {
    easyrtc.hangupAll();
    disable('hangupButton');
}



function clearConnectList() {
    var otherClientDiv = document.getElementById('otherClients');
    while (otherClientDiv.hasChildNodes()) {
        otherClientDiv.removeChild(otherClientDiv.lastChild);
    }
}

function clearConnectListchat() {
    var otherClientDiv1 = document.getElementById('chatid');
    while (otherClientDiv1.hasChildNodes()) {
        otherClientDiv1.removeChild(otherClientDiv1.lastChild);
    }
}


function convertListToButtons (roomName, occupants, isPrimary) {
    clearConnectList();
    clearConnectListchat();

    var otherClientDiv = document.getElementById('otherClients');
    var otherClientDiv1 = document.getElementById('chatid');

    for(var easyrtcid in occupants) {

        var button = document.createElement('button');
        var button1 = document.createElement('button');
        button.onclick = function(easyrtcid)
        {
            performCall(easyrtcid);
        }(easyrtcid);
        button1.onclick = function(easyrtcid) {
            return function() {
//                performCall(easyrtcid);
                sendStuffWS(easyrtcid);
            };
        }(easyrtcid);

        var label = document.createTextNode("Call " + easyrtc.idToName(easyrtcid));
        var label2 = document.createTextNode("Send to " + easyrtc.idToName(easyrtcid));

        button.appendChild(label);
        button1.appendChild(label2);

        otherClientDiv.appendChild(button);
        otherClientDiv1.appendChild(button1);

        if( !otherClientDiv1.hasChildNodes() ) {
            otherClientDiv1.innerHTML = "<em>Nobody else logged in to talk to...</em>";
        }
    }
}


function setUpMirror() {
    if( !haveSelfVideo) {
        var selfVideo = document.getElementById("selfVideo");
        easyrtc.setVideoObjectSrc(selfVideo, easyrtc.getLocalStream());
        selfVideo.muted = true;
        haveSelfVideo = true;
    }
}

function performCall(otherEasyrtcid) {
    easyrtc.hangupAll();
    var acceptedCB = function(accepted, easyrtcid) {
        if( !accepted ) {
            easyrtc.showError("CALL-REJECTEd", "Sorry, your call to " + easyrtc.idToName(easyrtcid) + " was rejected");
            enable('otherClients');
        }
    };

    var successCB = function() {
        if( easyrtc.getLocalStream()) {
            setUpMirror();
        }
        enable('hangupButton');
    };
    var failureCB = function() {
        enable('otherClients');
    };
    easyrtc.call(otherEasyrtcid, successCB, failureCB, acceptedCB);
    enable('hangupButton');
}


function loginSuccess(easyrtcid) {
    disable("connectButton");
    enable("disconnectButton");
    enable('otherClients');
    selfEasyrtcid = easyrtcid;
    document.getElementById("iam").innerHTML = "I am " + easyrtc.cleanId(easyrtcid);
    document.getElementById("iamm").innerHTML = "I am " + easyrtcid;
    easyrtc.showError("noerror", "logged in");
}


function loginFailure(errorCode, message) {
    easyrtc.showError(errorCode, message);
}

function disconnect() {
    easyrtc.disconnect();
    document.getElementById("iam").innerHTML = "logged out";
    enable("connectButton");
    disable("disconnectButton");
    easyrtc.clearMediaStream( document.getElementById('selfVideo'));
    easyrtc.setVideoObjectSrc(document.getElementById("selfVideo"),"");
    easyrtc.closeLocalMediaStream();
    easyrtc.setRoomOccupantListener( function(){});
    clearConnectList();
}


easyrtc.setStreamAcceptor( function(easyrtcid, stream) {
    setUpMirror();
    var video = document.getElementById('callerVideo');
    easyrtc.setVideoObjectSrc(video,stream);
    enable("hangupButton");
});



easyrtc.setOnStreamClosed( function (easyrtcid) {
    easyrtc.setVideoObjectSrc(document.getElementById('callerVideo'), "");
    disable("hangupButton");
});


var callerPending = null;

easyrtc.setCallCancelled( function(easyrtcid){
    if( easyrtcid === callerPending) {
        document.getElementById('acceptCallBox').style.display = "none";
        callerPending = false;
    }
});


easyrtc.setAcceptChecker(function(easyrtcid, callback) {
    if( easyrtc.getConnectionCount() = 0 ) {
        document.getElementById('acceptCallBox').style.display = "none";        
        wasAccepted = true;        
    }
    else{
        document.getElementById('acceptCallBox').style.display = "block";
        if( easyrtc.getConnectionCount() > 0 ) {
            document.getElementById('acceptCallLabel').innerHTML = "Drop current call and accept new from " + easyrtc.idToName(easyrtcid) + " ?";
        }
        else {
            document.getElementById('acceptCallLabel').innerHTML = "Accept incoming call from " + easyrtc.idToName(easyrtcid) + " ?";
        }        
    }
    //document.getElementById('acceptCallBox').style.display = "block";
    callerPending = easyrtcid;
    var acceptTheCall = function(wasAccepted) {
        document.getElementById('acceptCallBox').style.display = "none";
        if( wasAccepted && easyrtc.getConnectionCount() > 0 ) {
            easyrtc.hangupAll();
        }
        callback(wasAccepted);
        callerPending = null;
    };
    document.getElementById("callAcceptButton").onclick = function() {
        acceptTheCall(true);
    };
    document.getElementById("callRejectButton").onclick =function() {
        acceptTheCall(false);
    };
} );



//
//Copyright (c) 2016, Skedans Systems, Inc.
//All rights reserved.
//
//Redistribution and use in source and binary forms, with or without
//modification, are permitted provided that the following conditions are met:
//
//    * Redistributions of source code must retain the above copyright notice,
//      this list of conditions and the following disclaimer.
//    * Redistributions in binary form must reproduce the above copyright
//      notice, this list of conditions and the following disclaimer in the
//      documentation and/or other materials provided with the distribution.
//
//THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
//AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
//IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
//ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
//LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
//CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
//SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
//INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
//CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
//ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
//POSSIBILITY OF SUCH DAMAGE.
//

function addToConversation(who, msgType, content) {
    // Escape html special characters, then add linefeeds.
    content = content.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    content = content.replace(/\n/g, '<br />');
    document.getElementById('conversation').innerHTML +=
        "<b>" + who + ":</b>&nbsp;" + content + "<br />";
}


function sendStuffWS(otherEasyrtcid) {
    var text = document.getElementById('sendMessageText').value;
    if(text.replace(/\s/g, "").length === 0) { // Don't send just whitespace
        return;
    }

    easyrtc.sendDataWS(otherEasyrtcid, "message",  text);
    addToConversation("Me", "message", text);
    document.getElementById('sendMessageText').value = "";
}

