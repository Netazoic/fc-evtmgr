//Netazoic functions for working with jQuery library
//As of this writing using 1.7.2 and jquery-ui 1.10.3


// Thanks to http://stackoverflow.com/users/65387/mark
$.fn.selectRange = function(start, end) {
    if(!end) end = start; 
    return this.each(function() {
        if (this.setSelectionRange) {
            this.focus();
            this.setSelectionRange(start, end);
        } else if (this.createTextRange) {
            var range = this.createTextRange();
            range.collapse(true);
            range.moveEnd('character', end);
            range.moveStart('character', start);
            range.select();
        }
    });
};

function closeDialog(id) {
	$('#' + id).dialog("close");
	$('#' + id).remove();
}



var errHdlr = function(jqXHR, status, err) {
	// var test = $.parseJSON(jqXHR.responseText);
	var msg = err;
	msg += jqXHR.responseText;
	alert(msg);
}

function cLoad(id,url){
	$("#" + id).html(getAjaxContent(url));	
}

function getAjaxContent(url) {
	// This is *like* the jQuery $.load function, except it works better when
	// you want to
	// attach controllers to the pieces of content that are being loaded.
	/*
	 * Usage example: var dlg = $("#foobah"); 
	 * var url = "/hwsm?pAction=secatgrpCreateForm"; 
	 * url += "&seplatformCode=" +  platformCode; 
	 * var tmp = getAjaxContent(url); 
	 * dlg.html(tmp);
	 * 
	 * as opposed to . . . $("#foobah").load(url);
	 */
	var ts = new Date().getTime();
	var flgHasQuery = url.indexOf("?") > 0;
	if (flgHasQuery)
		url += "&" + ts;
	else
		url += "?" + ts;
	var content;
	var tmp;
	var fLoad = function(data) {
		content = data;
	}
	jqGet(url, true, fLoad, null, 'html');
	return content;
}

function getHeightWidth(id) {
	// id is a jQuery id;
	// http://stackoverflow.com/questions/2345784/jquery-get-height-of-hidden-element-in-jquery
	// http://stackoverflow.com/users/13249/nick-craver
	$(id).css({
		position : 'absolute', // Optional if #myDiv is already absolute
		visibility : 'hidden',
		display : 'block'
	});

	var h = $(id).height();
	var w = $(id).width();

	$(id).css({
		position : 'static', // Again optional if #myDiv is already absolute
		visibility : 'visible',
		display : 'none'
	});
	return [ h, w ];
}

function getDiv(divID){
	//get a jq div object. Create if not already present.
	var div = $("#" + divID);
	if(div[0]) return div;//already exists
	$("body").append("<div id='" + divID + "'></div>");
	div = $('#' + divID);
	if(!div){
		alert("Could not create div " + divID);
		return;
	}
	return div;
}

var indexOf = function(needle) {
    if(typeof Array.prototype.indexOf === 'function') {
        indexOf = Array.prototype.indexOf;
    } else {
        indexOf = function(needle) {
            var i = -1, index = -1;

            for(i = 0; i < this.length; i++) {
                if(this[i] === needle) {
                    index = i;
                    break;
                }
            }

            return index;
        };
    }

    return indexOf.call(this, needle);
};

function jqGet(myURL, flgSync, fLoad, fErr, dataType) {
	if (dataType == null)
		dataType = 'json';
	if (fErr == null)
		fErr = errHdlr;
	if (fLoad == null)
		fLoad = function(data) {
			// console.debug(data);
			return (data);
		}
	var jqxhr = $.ajax({
		type : "GET",
		url : myURL,
		async : !flgSync,
		success : fLoad,
		dataType : dataType
	}).fail(fErr);

}
function jqSubmit(f, flgSync, fLoad, fErr, dataType) {

	if (dataType == null)
		dataType = 'json';
	if (fErr == null)
		fErr = errHdlr;
	var jqxhr = $.ajax({
		type : "POST",
		url : f.action,
		data : $("#" + f.id).serialize(),
		async : !flgSync,
		success : fLoad,
		dataType : dataType
	}).done(function() {
		// alert( "second success" );
	}).fail(fErr).always(function() {
		// alert( "finished" );
	});
}


function setCheckBoxes(containerID, newOptions, currVals,commonID){
	//Adapted from answer by David Hedlund, http://stackoverflow.com/questions/2055459/dynamically-create-checkbox-with-jquery-from-text-input
	var $c = $("#" + containerID);
	$c.empty();
	var id,name;
	if(currVals) currVals = currVals.split(",");
	$.each(newOptions, function(key,value){
		id = commonID?commonID+"_"+value:key;
		name = commonID?commonID:key;
		$c.append($("<input />",{type: 'checkbox', id: id, name: name, value: value}));
	    $c.append($('<label />', { 'for': id, 'text': key }));
	    if(currVals){
	    	var idx = indexOf.call(currVals,value);
	    	if(idx>=0) $("#" + containerID+" input:last").prop("checked",true);
	    }
	
	});

}


function showDialog(id, opts) {
	// id is a divID
	var minHeight = 300;
	var minWidth = 500;

	var div = document.getElementById(id);
	var jqID = "#" + id;
	var x = getHeightWidth(jqID);
	var h = x[0];
	var w = x[1];
	h = h < minHeight ? minHeight : h;
	w = w < minWidth ? minWidth : w;
	if (opts == null)
		opts = {};
	if (!opts.height)
		opts.height = h * 1;
	if (!opts.width)
		opts.width = w * 1;
	opts.show = "fade";
	// opts.hide = "drop";
	// opts = {height:800,width:600};
	$(jqID).dialog(opts);

}