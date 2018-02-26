// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

const serialport = require('serialport')

let openPort = null

function pad(n, width, z) {
  z = z || '0';
  n = n + '';
  return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

function stringToHex(str) {
  var val="";
  for(var i = 0; i < str.length; i++){
    if(val == "")
      val = pad(str.charCodeAt(i).toString(16), 2).toUpperCase();
    else
      val += " " + pad(str.charCodeAt(i).toString(16), 2).toUpperCase();
  }
  return val;
}

function hexToString(str) {
  var val="";
  var arr = str.split(" ");
  for(var i = 0; i < arr.length; i++){
    val += String.fromCharCode(parseInt(arr[i], 16).toString(10));
  }
  return val;
}

function CRC16(str) {
  var mid = 0;
  var CRC = 0xFFFF;

  for(var i = 0; i < str.length; i++) {
    CRC = str.charCodeAt(i)^CRC;
    for (var j = 0; j < 8; j++) {
      mid = CRC;
      CRC = CRC>>1;
      if (mid&0x0001)
        CRC = CRC^0xA001;
    }
  }

  var CRCH = CRC >>> 8;
  var CRCL = CRC & 0x0FF;

  str += String.fromCharCode(parseInt(CRCL, 10).toString(10));
  str += String.fromCharCode(parseInt(CRCH, 10).toString(10));

  return str;
}

// 对Date的扩展，将 Date 转化为指定格式的String
// 月(M)、日(d)、小时(h)、分(m)、秒(s)、季度(q) 可以用 1-2 个占位符，
// 年(y)可以用 1-4 个占位符，毫秒(S)只能用 1 个占位符(是 1-3 位的数字)
// 例子：
// (new Date()).Format("yyyy-MM-dd hh:mm:ss.S") ==> 2006-07-02 08:09:04.423
// (new Date()).Format("yyyy-M-d h:m:s.S")      ==> 2006-7-2 8:9:4.18
Date.prototype.Format = function (fmt) {
  var o = {
    "M+": this.getMonth() + 1, //月份
    "d+": this.getDate(), //日
    "h+": this.getHours(), //小时
    "m+": this.getMinutes(), //分
    "s+": this.getSeconds(), //秒
    "q+": Math.floor((this.getMonth() + 3) / 3), //季度
    "S+": this.getMilliseconds() //毫秒
  };
  if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
  for (var k in o)
  if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("0".repeat(RegExp.$1.length) + o[k]).substr(("" + o[k]).length)));
  return fmt;
}

serialport.list((err, ports) => {
  if (err) {
    document.getElementById('error').textContent = err.message
    return
  } else {
    document.getElementById('error').textContent = ''
  }

  if (ports.length === 0) {
    document.getElementById('error').textContent = 'No ports discovered'
  }

  ports.forEach(port => {
    document.getElementById('Port').options.add(new Option(port.comName, port.comName));
  });
})

window.onload = function() {
  var height = window.getComputedStyle(document.getElementById("SendDataArea")).getPropertyValue('height');

  document.getElementById("SendDataButton").style.height = height;
  document.getElementById("Port").disabled = false;
  document.getElementById("Baudrate").disabled = false;
  document.getElementById("PortCtrlButton").value = "Open";
  document.getElementById("PortCtrlButton").innerHTML = "<img src='static/images/button_black.png' class='w3-image'>";
  document.getElementById("SendDataButton").disabled = true;
}

document.getElementById("PortCtrlButton").addEventListener('click', function() {
  var display_msg = "";

  if (document.getElementById("Display_Time").checked) {
    display_msg = '[' + new Date().Format("hh:mm:ss.SSS") + ']: ';
  }

  if (openPort !== null) {
    openPort.close();
    openPort = null;
  }

  if (document.getElementById("PortCtrlButton").value == "Open") {
    openPort = new serialport(document.getElementById("Port").value, {
      baudRate: parseInt(document.getElementById("Baudrate").value, 10)
    });
    openPort.on('readable', function() {
      var data = openPort.read().toString();
      var display_msg = "";

      if (document.getElementById("Display_Time").checked) {
        display_msg = '[' + new Date().Format("hh:mm:ss.SSS") + ']: ';
      }
      if (document.getElementById("Disaplay_Hex").checked) {
        display_msg += stringToHex(data);
      } else {
        display_msg += data;
      }
      if (document.getElementById("Auto_NewLine").checked) {
        display_msg += '\n';
      }

      var indata = document.getElementById("IncomingDataArea");
      indata.value = indata.value + display_msg;
      indata.scrollTop = indata.scrollHeight;
    });
    document.getElementById("Port").disabled = true;
    document.getElementById("Baudrate").disabled = true;
    document.getElementById("PortCtrlButton").value = "Close";
    document.getElementById("PortCtrlButton").innerHTML = "<img src='static/images/button_red.png' class='w3-image'>";
    document.getElementById("SendDataButton").disabled = false;
    display_msg += ("Uart Connected\n");
  } else {
    document.getElementById("Port").disabled = false;
    document.getElementById("Baudrate").disabled = false;
    document.getElementById("PortCtrlButton").value = "Open";
    document.getElementById("PortCtrlButton").innerHTML = "<img src='static/images/button_black.png' class='w3-image'>";
    document.getElementById("SendDataButton").disabled = true;
    display_msg += ("Uart Disconnected\n");
  }

  var indata = document.getElementById("IncomingDataArea");
  indata.value = indata.value + display_msg;
  indata.scrollTop = indata.scrollHeight;
}, false);

document.getElementById("SendDataButton").addEventListener('click', function() {
  if (document.getElementById("Send_as_Hex").checked) {
    if (document.getElementById("AppendCRC").checked) {
      var str = CRC16(hexToString(document.getElementById("SendDataArea").value));
      document.getElementById("CRC16ResultData").value = stringToHex(str)
      openPort.write(str);
    } else {
      openPort.write(hexToString(document.getElementById("SendDataArea").value));
    }
  } else {
    openPort.write(document.getElementById("SendDataArea").value);
  }
}, false);

document.getElementById("Send_as_Hex").addEventListener('click', function() {
  if (document.getElementById("Send_as_Hex").checked) {
    document.getElementById("SendDataArea").value = stringToHex(document.getElementById("SendDataArea").value);
    document.getElementById("AppendCRC").disabled = false;
  } else {
    document.getElementById("SendDataArea").value = hexToString(document.getElementById("SendDataArea").value);
    document.getElementById("AppendCRC").disabled = true;
  }
})

document.getElementById("AppendCRC").addEventListener('click', function() {
  if (document.getElementById("AppendCRC").checked) {
    document.getElementById("CRC16Result").hidden = false;
  } else {
    document.getElementById("CRC16Result").hidden = true;
  }
})

document.getElementById("ClearIncomingDataArea").addEventListener('click', function() {
  document.getElementById("IncomingDataArea").value = "";
})

document.getElementById("ClearSendDataArea").addEventListener('click', function() {
  document.getElementById("SendDataArea").value = "";
})

function destroyClickedElement(event) {
  document.body.removeChild(event.target);
}

document.getElementById("SaveIncomingDataArea").addEventListener('click', function() {
  var textToSave = document.getElementById("IncomingDataArea").value;
  var textToSaveAsBlob = new Blob([textToSave], {type:"text/plain"});
  var textToSaveAsURL = window.URL.createObjectURL(textToSaveAsBlob);
  var fileNameToSaveAs = new Date().Format("yyyy-MM-dd hh:mm:ss");

  var downloadLink = document.createElement("a");
  downloadLink.download = fileNameToSaveAs;
  downloadLink.innerHTML = "Download File";
  downloadLink.href = textToSaveAsURL;
  downloadLink.onclick = destroyClickedElement;
  downloadLink.style.display = "none";
  document.body.appendChild(downloadLink);

  downloadLink.click();
})

document.getElementById("LoadSendData").addEventListener('click', function() {
  document.getElementById('selectedFile').click();
})

document.getElementById("selectedFile").addEventListener('change', function() {
  var fileToLoad = document.getElementById("selectedFile").files[0];
  var fileReader = new FileReader();

  fileReader.onload = function(fileLoadedEvent) {
    var textFromFileLoaded = fileLoadedEvent.target.result;
    document.getElementById("SendDataArea").value = textFromFileLoaded;
  };
  fileReader.readAsText(fileToLoad, "UTF-8");

  /* Make sure the onchange will fire even we select the same file again */
  document.getElementById("selectedFile").value = "";
})
