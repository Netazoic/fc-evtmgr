//For use with the fullcalendar library by Adam Shaw
//www.fullcalendar.com

var calendar;
var flgFirstClick;
var editTemplate;
var createTemplate;
var rruleTemplate;
var calendarID;  //Must be set in the parent page
var DIR_FC="/js/fullcalendar-1.6.2";
var DIV_ID="eventEdit";
var DIV_ID_C="eventCreate";
var RRULE_DIV_ID="divRRule";

var fmtDateTime =("YYYY/MM/DD HH:mm Z");
var fmtDisplay =("MM/DD/YYYY HH:mm");
var fmtDay = ("MM/DD/YYYY");
var fmtTime = ("h:mma");
var fmtFC = ("MM/DD/YYYY HH:mma");

var globEvent;
//Minimum dimensions for event create/edit dialog
var minHeight="500";
var minWidth="700";
var evtCategoryData;     //Can be set in the enclosing page
var recurrenceRuleData;	//Can be set in the enclosing page

function closeDialog(id){
	$('#' + id).dialog("close");
	$('#' + id).remove();
}

function closeEventCreate() {
	closeDialog(DIV_ID_C);
}
function closeEventEdit() {
	closeDialog(DIV_ID);
}

function contextMenu(event, element) {
	alert('context menu!');
}

function createFCEvent(f) {
	// create an event based on form data

	if(!f.evtTitle.value){
		alert ("The title field cannot be empty");
		return false;
	}
	//Update evtStart and evtEnd
	setDateTimeField(f);
	// Send the event to the back end
	var url = "/cal?pAction=eventCreate";
	f.action = url;
	var event;
	var id;
	var fLoad = function(data) {
		event = evalJSON(data);
		// Times are passed through json as millisecond values.
		// These need to be converted into actual date objects.
		event.start = new Date(event.start);
		event.end = new Date(event.end);
 		// render in the calendar
		calendar.fullCalendar('renderEvent', event, false // make the event
															// not "stick"
		);
		id = event.id;
	}
	// var jqID = "#" + f.id;
	// $.post(url, $(jqID).serialize(), fLoad);
	xhrSubmit(f, true, fLoad);
	return id;
}

function createFCEventAndCloseDialog(f){
	var id = createFCEvent(f);
	if(! id) return false;
	closeDialog(DIV_ID_C);
}

function createAndEditEvent(f){
	var id = createFCEvent(f);

	if(!id) return false;
	closeEventCreate();
	var evt = {};
	evt.id = id;
	evt.calendarid = f.calendarID.value;
	evt.title = f.evtTitle.value;
	evt.start = f.evtStart.value;
	evt.end = f.evtEnd.value;
	var ad = f.allDay.value;
	evt.allDay = ad=="true"?true:false;
	editCalendarEvent(evt);

}



function dayClickHdlr(date, allDay, jsEvent, view) {
	  flgFirstClick=true;
	  //if(view.name != 'month')  return;
	  if(view.name == 'basicDay'){
		  showCreateFCEvent(date,date,allDay);
	  }
	  if(view.name == 'agendaWeek'){
		  if(allDay){
			  calendar.fullCalendar('changeView', 'agendaDay').fullCalendar('gotoDate', date);
		  }
	  }
	  if(view.name == 'agendaDay'){
		  //if(! allDay) return;
		  showCreateFCEvent(date,date,allDay);  
	  }
	  else if(view.name == 'month'){
		  showCreateFCEvent(date,date,allDay);
		
		  //This would pop the agendaDay view
		  //calendar.fullCalendar('changeView', 'agendaDay')
	      //          .fullCalendar('gotoDate', date);
	      
	  }
	}

function deleteFCEvent(f){
	var url ="/cal?pAction=eventDelete";
	f.action=url;
	var fLoad = function(data){
		event = evalJSON(data);
		var id = event.id;
		calendar.fullCalendar('removeEvents', id );	
		};
	xhrSubmit(f,false,fLoad);
}
function dropHdlr(event,dayDelta,minuteDelta,allDay,revertFunc) {

     if (allDay) {
        //alert("Event is now all-day");
    }else{
        //alert("Event has a time-of-day");
    }

	//calendar.fullCalendar('updateEvent',event);
    //editFCEvent(event);
    updateEventTimes(event);
}

function editCalendarEvent(evt){
	closeEventEdit();
	var id = evt.id;
	//get the full calendarevent record
	evt = getCalendarEventRecord(id);
	var opts = {};
	opts.editType = "Advanced";
	opts.height = 700;
	opts.width = 800;
	//opts.position = {my:"top", at: "top", of:"window"}
	editFCEvent(evt,null,null,opts);
}

function editRRule(evt){
	var divID = RRULE_DIV_ID;
	var drr = $('#' + divID);
	if(!drr[0]){
		$("body").append("<div id='" + divID + "'></div>");
		drr = $('#' + divID);
		if(!drr){
			alert("Could not create div " + divID);
			return;
		}
	}
	rrule = getRRule(evt.rruleID);
	//setRRuleFields(rrule);
	
	var str = getRRuleTemplate();
	str = supplant(str, rrule);
	drr.html(str);
	drr.dialog();
	
}

function editFCEvent(evt, jsEvt, view, opts) {
	var divID = DIV_ID;
	var formID = "frmEditEvent";
	var edit = $('#' + divID);
	var dEdit = $('#' + divID);
	if(!dEdit[0]){
		$("body").append("<div id='" + divID + "'></div>");
		dEdit = $('#' + divID);
		if(!dEdit){
			alert("Could not create div " + divID);
			return;
		}
	}

	if(!opts) {
		opts = {};
		// BD pump up height to fit everything - isn't there a better (responsive) way?
		opts.height = 560;
	}
	opts.title = "Event Details";
	
	//get the full calendarevent record
	var id = evt.id;
	evt = getCalendarEventRecord(evt);
	setEvtFields(evt);
	evt.formID = formID;
	
	var str = getEditTemplate();
	str = supplant(str, evt);
	dEdit.html(str);
	//edit[0].innerHTML = str;


	
	//Put the event into the client memory
	globEvent = evt;
	
	var fLoadEdit = function(){
		/*
		 * Need a retry loop in case the dialog html is not yet loaded in the dom
		 * !@#$#QWER IE
		 */
		if(! $("#" + formID)[0].evtStartDate){
			setTimeout(fLoadEdit, 250);
			return;
		}
		setButtons('EDIT');
		$(".datepicker").datepicker();
		$(".timepicker").timepicker({scrollDefaultTime:'09:00'});
		$("#evtStartDate").change(setDateRange);
		$("#evtStartTime").change(setTimeRange);
		$('#flgAllDay').change(function(){
			setAllDayFields(this.checked);
		});
		$('#flgRepeating').change(function(event){
			editRRule(evt);
		});
		setAllDayFields(evt.allDay);	
		//Load the event category select
		setEvtCategorySelect(evt);
		//Load the recurrenc rules
		setEvtRecurrenceSelect(evt);
		return false;
	}
	opts.open = fLoadEdit;
	opts.dialogClass = evt.className;
	showDialog(divID,opts);
  	
	//Return false to prevent automatic opening of the event.url
	return false;
}

function setAllDayFields(flg){
	if(flg){
		$('.timepicker').hide();
		//$('#divEvtEndDate').hide();
		$('#flgAllDay').prop('checked', true);
	}
	else{
		$('.timepicker').show();
	}
}



function fixEventSend(event){
	//Runs once per received event
	//Fix the boolean value in allDay
	var val = event.allday;
	if(!val) val = event.allDay;
	if(val == 't'|| val == "true") event.allDay = true;
	else event.allDay = false;
	// Event styles
	event.className = "event" + event.categorycode;
	//if(event.categorycode) event.color = "red";
	return event;
}
function formatDateTime(myDate) {
	return (myDate.getMonth() + 1 + "/" + myDate.getDate() + "/"
			+ myDate.getFullYear() + " " + myDate.getHours() + ":" + myDate
			.getMinutes());
}
function formatDate(myDate) {
	return (myDate.getMonth() + 1 + "/" + myDate.getDate() + "/" + myDate
			.getFullYear());
}

function getRRule(rruleID){
	var url = "/cal?pAction=GetRecords";
	url += "&q=/CAL/Calendar/sql/GetRRule.sql";
	
	url += "&rruleID=" + rruleID;
	var rrule;
	var fLoad = function(data){
		rrule = data;
	}
	jqGet(url,true,fLoad);
	return rrule;
}

function getCalendarEventRecord(evt){
	//Get the full CalendarEvent record
	//Returns an event object with all the FullCalendar fields + all the app specific fields
	var eventID = evt.id;
	var url = "/cal?pAction=eventRetrieve&eventID=" + eventID;
	var evtC;
	var val;
	var fLoad = function(data){
		evtC = data;
		//fix problem chars
		for (k in evtC){
			val = evtC[k];
			if(!val) continue;
			if(typeof(val) != "string") continue;
			val = val.replace(/\"/g,"\\\"");
			evtC[k] = val;
		}
		//Make sure all the fullcalendar fields in the record
		for(k in evt){
			if((evt[k]) && !(evtC[k]))
				evtC[k] = evt[k];
		}
		//convert start and end values
		evtC['start'] = moment(evtC['start']).toDate();
		evtC['end'] = moment(evtC['end']).toDate();

	}
	jqGet(url,true,fLoad);
	return evtC;	
}


function getDay(myDate) {
	return (myDate.getMonth() + 1 + "/" + myDate.getDate() + "/" + myDate
			.getFullYear());
}

function getCreateTemplate(){
	if(createTemplate) return createTemplate;
	var ts = new Date().getTime();
	var url=DIR_FC +"/evtmgr/CreateEvent.htm";
	url += "?" + ts;

	var tmp;
	var fLoad = function(data){
		tmp = data;
		createTemplate = tmp;
	}
	jqGet(url,true,fLoad,null,'text');
	return createTemplate;
}

function getEditTemplate(eventID){
	if(editTemplate) return editTemplate;
	var ts = new Date().getTime();
	var url;
	url=DIR_FC +"/evtmgr/EditEvent.htm";
	url += "?_" + ts;
	/*
	if(eventID){
		//The full-blown CalendarEvent edit
		url = "/cal?pAction=eventEdit&eventID=" + eventID;
		url += "&_" + ts;

	}
	else{
		//The minimalist event editor
		url=DIR_FC +"/evtmgr/CreateEditEvent.htm";
		url += "?_" + ts;

	}*/
	var tmp;
	var fLoad = function(data){
		tmp = data;
		editTemplate = tmp;
	}
	jqGet(url,true,fLoad,null,'text');
	return editTemplate;
}

function getRRuleTemplate(){
	if(rruleTemplate) return rruleTemplate;
	var ts = new Date().getTime();
	var url=DIR_FC +"/evtmgr/CreateRRule.htm";
	url += "?" + ts;

	var tmp;
	var fLoad = function(data){
		tmp = data;
		createTemplate = tmp;
	}
	jqGet(url,true,fLoad,null,'text');
	return createTemplate;
}

function resizeHdlr( event, dayDelta, minuteDelta, revertFunc, jsEvent, ui, view) {



	//calendar.fullCalendar('updateEvent',event);
   //editFCEvent(event);
   updateEventTimes(event);
}



function selectHdlr(start, end, allDay) {
	if(flgFirstClick){
		flgFirstClick = false;
		return;
	}
	var view = calendar.fullCalendar('getView');
	console.debug("View: " + view);
	var flgEventEdit = $('#eventEdit').is(":visible");
	if (flgEventEdit) {
		// Event edit window already displayed. Close it now
		closeEventEdit();
	} else {
		showCreateFCEvent(start, end, allDay);
		calendar.fullCalendar('unselect');
	}
}

function selectHdlrDemo(start, end, allDay) {
	var title = prompt('Event Title:');
	if (title) {
		calendar.fullCalendar('renderEvent', {
			title : title,
			start : start,
			end : end,
			allDay : allDay
		}, true // make the event "stick"
		);
	}
	calendar.fullCalendar('unselect');
}

function setEvtRecurrenceSelect(evt){
	$("#rruleID").empty()
	$("#rruleID").append($("<option></option>").attr("value","").text("-- Select Recurrence --").addClass("select-recurrence"));
	if(recurrenceRuleData.length ==0){
		$("#rruleID").append($("<option></option>").attr("value","").text("No recurrence rules defined"));
		
	}
	$.each(recurrenceRuleData, function() {
		if(this.rruleid == evt.rruleID){
			   $("#rruleID").append($("<option></option>")
					   .attr("value",this.rruleid)
					   .attr("selected",true)
					   .text( this.recrulename ));
		}
		else	
			$("#rruleID").append($("<option></option>")
					.attr("value",this.rruleid)
					.text(this.recrulename));
	 });
	
	var setClassName = function(evt){
	    var className = "";   
	       className =  'event' + $(this).val();
	       $(this).removeClass();
	       $(this).addClass(className);
	}

	  $("#rruleID").change(setClassName)

	return true;
}


function setEvtCategorySelect(evt){
	$("#categoryCode").empty()
	$("#categoryCode").append($("<option></option>").attr("value","").text("-- Select Category --").addClass("select-category"));
	if(evtCategoryData.length ==0){
		$("#categoryCode").append($("<option></option>").attr("value","").text("No categories defined"));
		
	}
	$.each(evtCategoryData, function() {
		if(this.categorycode == evt.categoryCode){
			   $("#categoryCode").append($("<option></option>")
					   .attr("value",this.categorycode)
					   .attr("selected",true)
					   .text( this.categoryname )
					   .addClass(this.classname));
			   $("#categoryCode").addClass(this.classname);
		}
		else	
			$("#categoryCode").append($("<option></option>")
					.attr("value",this.categorycode)
					.text(this.categoryname)
					.addClass(this.classname));
	 });
	
	var setClassName = function(evt){
	    var className = "";   
	       className =  'event' + $(this).val();
	       $(this).removeClass();
	       $(this).addClass(className);
	}

	  $("#categoryCode").change(setClassName)
	//if(evt && evt.categoryCode){
	//	$("categoryCode").val(evt.categoryCode);
	//}
/*
	var items = evtCategoryData;
	var list = document.getElementById("categoryCode");
	for(var i in items) {
	  list.add(new Option(items[i].categoryname, items[i].categorycode));
	}
	*/
	return true;
}

function setEvtFields(evt){
	var startDate = moment(evt.start);
	var endDate = moment(evt.end);
	var startDisplay, endDisplay;
	var startString,endString;
	startDisplay = startDate.format(fmtDisplay);
	startString = startDate.format(fmtDateTime);
	evt.startString = startString;
	evt.startDisplay = startDisplay;
	evt.starttime = startDate.format(fmtTime);
	evt.startdate = startDate.format(fmtDay);

	if(endDate){
		endString = endDate.format(fmtDateTime);
		endDisplay = endDate.format(fmtDisplay);
		evt.endtime = endDate.format(fmtTime);
		evt.enddate = endDate.format(fmtDay);
		evt.endString = endString;
		evt.endDisplay = endDisplay;
	}
	evt.day = getDay(evt.start);
}

function setDateRange(evtObj){
	//evtObj is a javascript UI event
	//Fired after a date picker is changed
	// 'this' is evtStartDate
	var endDateObj = $("#evtEndDate");
	var startDate = this.value;
	var d = new Date(startDate);
	$("#evtEndDate").datepicker("option","minDate",d);
	
}

function setTimeRange(evtObj){
	//evtObj is a javascript UI event
	//Fired after a time picker is changed
	// 'this' is evtStarttime
	var end = $("#evtEndTime");
	var start = $("#evtStartTime");
	var startTime = this.value;
	var startInt = start.timepicker('getSecondsFromMidnight');
	var endInt = end.timepicker('getSecondsFromMidnight');
	var delta = endInt - startInt;
	if(!delta || delta < 0) delta = 1800;

	//var opts = {};
	//opts.disableTimeRanges = [['12:00am','" + startTime +"']];
	//$("#evtEndTime").timepicker(opts);
	end.timepicker('option', 'minTime', startInt);
	var newEnd = (startInt+delta)%86400;
	end.timepicker('setTime', newEnd);
}

function setDateTimeField(f){
	//var f = el.form;
	var dateStart = f.evtStartDate.value;
	var dateEnd = f.evtEndDate.value;
	var timeStart = f.evtStartTime.value;
	var timeEnd = f.evtEndTime.value;
	
	var start = moment(dateStart + " " + timeStart, fmtFC);
	var end = moment(dateEnd + " " + timeEnd, fmtFC);
	var zone = start.zone();
	f.evtStart.value = start.valueOf();
	f.evtEnd.value = end.valueOf();
	f.evtStartString.value=start.format(fmtDateTime);
	f.evtEndString.value=end.format(fmtDateTime);
	f.dateTimeString.value = dateStart+ " " + timeStart + "-" + dateEnd + " " + timeEnd;
}

function setButtons(mode){

	$(".evtButton").hide();
	if(mode == 'CREATE'){
		$('#btnCreateEvt').show();
		$('#btnCancelCreateEvt').show();
	}else{
		$('#btnUpdateEvt').show();
		$('#btnDeleteEvt').show();
		$('#btnCancelEditEvt').show();	
	}
}

function showCreateFCEvent(startDate, endDate, allDay) {

	var opts = new Array();
	opts.title = "Create Event";
	// BD pump up height to fit everything - isn't there a better (responsive) way?
	opts.height = 560;

	var divID = DIV_ID_C;
	var formID = "frmCreateEvent";

	var dCreate = $('#' + divID);
	if(!dCreate[0]){
		$("body").append("<div id='" + divID + "'></div>");
		dCreate = $('#' + divID);
		if(!dCreate){
			alert("Could not create div " + divID);
			return;
		}
	}
	var start = moment(startDate);
	var end = moment(endDate);
	//make sure the event is at least 1/2 hour long if not an allDay
	if(!allDay){
		var diff = start.diff(end,'minutes');
		if(diff<30) end.add('m',30);
	}
	
	var evt = {
			start : start.toDate(),
			end : end.toDate(),
			allDay : allDay,
			calendarid: calendarID
		}

	setEvtFields(evt);
	evt.formID = formID;
	
	var str = getCreateTemplate();
	str = supplant(str, evt);
	dCreate.html(str);
	
	var fLoadCreate = function(){
		/*
		 * Need a retry loop in case the dialog html is not yet loaded in the dom
		 * !@#$#QWER IE
		 */
		if(! $("#" + formID)[0].evtStartDate){
			setTimeout(fLoadCreate, 250);
			return;
		}
		//Setup the date fields
		var f = $("#" + formID)[0];
		//setDateTimeField(f);
		$(".datepicker").datepicker();
		$(".timepicker").timepicker();
		//$('#' + formID +' input.timepicker').change(function(){setDateTimeField(this);});
		//$('#' + formID + ' input.datepicker').change(function(){setDateTimeField(this);});

		$('#flgAllDay').change(function(){
			setAllDayFields(this.checked);
		});
		setAllDayFields(evt.allDay);
		setButtons('CREATE');	
		setEvtCategorySelect(evt);
		//Load the recurrence rules
		setEvtRecurrenceSelect(evt);
	}
	opts.open = fLoadCreate;
	showDialog(divID,opts);
}


function showDiv(id) {
	var divEdit = document.getElementById(id);
	jqID = "#" + id;
	var de = $(jqID);
	var offset = de.offset();
	var ww = $(window).width();
	var wh = $(window).height();

	var top = offset.top;
	var left = offset.left;
	var x = (ww - de.width()) / 2;
	var y = (wh - de.height()) / 2;

	divEdit.style.left = left + x + "px";
	divEdit.style.top = top + y + "px";
	divEdit.style.position = "absolute";
	// divEdit.style.display="block";

	// alert(divEdit.innerHTML);
	$(jqID).show();
}

function showDialog(id,opts){
	//id is a divID

	var div = document.getElementById(id);
	var jqID = "#" + id;
	var x = getHeightWidth(jqID);
	var h = x[0];
	var w = x[1];
	h=h<minHeight?minHeight:h;
	w=w<minWidth?minWidth:w;
	if(opts == null) opts ={};
	if(!opts.height) opts.height = h*1;
	if(!opts.width) opts.width = w*1;
	opts.show = "fade";
	//opts.hide = "drop";
	//opts = {height:800,width:600};
	$(jqID).dialog(opts);    

}

function supplant(str, o) {
	return str.replace(/{([^{}]*)}/g, function(a, b) {
		var r = o[b];
		return typeof r == 'string'?
				r == null ? '' : r.replace(/\"/g,"&quot;") :
				r == null ? '' : r;
;
		// return r == null ? a : r;
			// return typeof r === 'string' ?
			// r : a;
		});
}

function toggleAdvanced(el){
	var divAEID = 'divAdvancedEdit';
	var jqAE = $('#'+divAEID);
	jqAE.toggle();
	
	var divAE = jqAE[0];
	if(divAE.style.display == "none") el.innerHTML = "+";
	else el.innerHTML = "-";
	
	var jq = $('#' +'eventWrapper');
	var div = jq[0];
	var h = div.scrollHeight + 100;
	$('#' + DIV_ID).dialog("option","height",h);

	return false;
}


function getHeightWidth(id) {
	//id is a jQuery id;
	//http://stackoverflow.com/questions/2345784/jquery-get-height-of-hidden-element-in-jquery
	//http://stackoverflow.com/users/13249/nick-craver
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
	return [h,w];
}


function updateFCEventForm(f,evt){
	if(!f){
		editFCEvent(evt);
	}
	//Update evtStart and evtEnd
	setDateTimeField(f);
	if(!evt) evt = globEvent;
	var evtObj = f.evtObject;
	if(!evtObj){
		evtObj = {id:'evtObject'};
		$('#' + f.id).append(evtObj);
	}
	for(k in globEvent){
		var v = globEvent[k];
		evtObj[k] = v;
	}
	var url ="/cal?pAction=eventUpdate";
	f.action=url;
	//TODO
	var fLoad = function(data){
		var event = jQuery.parseJSON(data);
		//event = evalJSON(data);
		var k,v;
		for(k in event){
			v = event[k];
			evt[k] = v;
		}
		evt.start = new Date(event.start);
		evt.end = new Date(event.end);
		evt.allDay = event.allDay;
		//if(evt.allDay) evt.end = null;
		calendar.fullCalendar('updateEvent',evt);
		//calendar.fullCalendar('renderEvent', event, true );	
		};
	xhrSubmit(f,false,fLoad);
	
}

function updateEventTimes(evt){
	var start = moment(evt.start);
	var end = moment(evt.end);
	if(!end) end = start;
	var url = "/cal?pAction=eventUpdate";
	url += "&eventID=" + evt.id;
	url += "&calendarID=" + evt.calendarid;
	url +="&evtStartString=" + start.format(fmtDateTime);
	url +="&evtEndString=" + end.format(fmtDateTime);
	url +="&flgUpdate=true";
	jqGet(url,false,null);
}

function updateAndCloseEvent(f){
	updateFCEventForm(f);
	closeEventEdit();
	return false;
}
