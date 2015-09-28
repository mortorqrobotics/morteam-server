function singleDecimalToHex(num){
	var hexOnlyDigits = ["a", "b", "c", "d", "e", "f"]
	num = parseInt(num);
	if (num < 10){
		return num.toString();
	}else{
		return hexOnlyDigits[num%10];
	}

}
function singleHexToDecimal(hex){
	hex = hex.toString();
	if( isNaN( parseInt(hex) ) ){
		if(hex == "a"){
			return "10";
		} else if(hex == "b") {
			return "11";
		} else if(hex == "c") {
			return "12";
		} else if(hex == "d") {
			return "13";
		} else if(hex == "e") {
			return "14";
		} else if(hex == "f") {
			return "15";
		}else{
			return undefined;
		}

	}else{
		return parseInt(hex).toString();
	}
}
function hexToDecimal(hex){
	hex = hex.toString();
	if(hex.length == 1){
		return singleHexToDecimal(hex);
	}else{
		var leftDigit = hex.substring(0,1);
		var rightDigit = hex.substring(1);
		leftDigit = parseInt( singleHexToDecimal(leftDigit) );
		rightDigit = parseInt( singleHexToDecimal(rightDigit) );
		return leftDigit*16 + rightDigit;
	}
}
function decimalToHex(num){
	num = parseInt(num);
	return singleDecimalToHex( Math.floor(num/16.0) )  + singleDecimalToHex( num%16 );
}
String.prototype.darkenHexColorBy = function(val){
var target = this;
	if(target.length == 7 && target.indexOf("#") == 0){
		target = target.substring(1);
	}
	if(target.length == 6 && target.indexOf("#") < 0){
		var r = target.substring(0,2);
		var g = target.substring(2,4);
		var b = target.substring(4);
		var dr = decimalToHex( hexToDecimal(r) - parseInt(val) );
		if(dr.indexOf("-") > -1){ dr = "00" };
		var dg = decimalToHex( hexToDecimal(g) - parseInt(val) );
		if(dg.indexOf("-") > -1){ dg = "00" };
		var db = decimalToHex( hexToDecimal(b) - parseInt(val) );
		if(db.indexOf("-") > -1){ db = "00" };
		return dr.toString() + dg.toString() + db.toString()
	}else{
		console.log("not a valid color");
		return target;
	}
}
String.prototype.lightenHexColorBy = function(val){
var target = this;
	if(target.length == 7 && target.indexOf("#") == 0){
		target = target.substring(1);
	}
	if(target.length == 6 && target.indexOf("#") < 0){
		var r = target.substring(0,2);
		var g = target.substring(2,4);
		var b = target.substring(4);
		var lr = decimalToHex( hexToDecimal(r) + parseInt(val) );
		if( parseInt(hexToDecimal(lr)) > 255){ lr = "ff" };
		var lg = decimalToHex( hexToDecimal(g) + parseInt(val) );
		if( parseInt(hexToDecimal(lg)) > 255){ lg = "ff" };
		var lb = decimalToHex( hexToDecimal(b) + parseInt(val) );
		if( parseInt(hexToDecimal(lb)) > 255){ lb = "ff" };
		return lr.toString() + lg.toString() + lb.toString()
	}else{
		console.log("not a valid color");
		return target;
	}
}
var hexDigits = new Array
		("0","1","2","3","4","5","6","7","8","9","a","b","c","d","e","f");

//Function to convert hex format to a rgb color
function rgb2hex(rgb) {
	if (/^#[0-9A-F]{6}$/i.test(rgb)) return rgb;

	rgb = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
	function hex(x) {
		return ("0" + parseInt(x).toString(16)).slice(-2);
	}
	return "#" + hex(rgb[1]) + hex(rgb[2]) + hex(rgb[3]);
}
function hex(x) {
  return isNaN(x) ? "00" : hexDigits[(x - x % 16) / 16] + hexDigits[x % 16];
}
