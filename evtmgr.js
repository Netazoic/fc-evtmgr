//For use with the fullcalendar library by Adam Shaw
//www.fullcalendar.com

//SET BY USER
var DIR_FC="/lib/fc-evtmgr";		//Path to this library
//set to the REST points for your back end system
var URL_CREATE_EVENT;			//e.g., "/cal?pAction=eventCreate";
var URL_RETRIEVE_EVENT;			//e.g., "/cal?pAction=eventRetrieve"
var URL_UPDATE_EVENT;   		//e.g., "/cal?pAction=eventUpdate";
var URL_DELETE_EVENT;			//e.g.,	"/cal?pAction=eventDelete";
var URL_CREATE_RULE;			//e.g., "/cal?pAction=rruleCreate";
var URL_RETRIEVE_RULE;			//e.g., "/cal?pAction=GetRecords&q=/CAL/Event/sql/RetrieveRRULE.sql";
var URL_UPDATE_RULE;			//e.g., "/cal?pAction=rruleUpdate";
var URL_DELETE_RULE;			//e.g., "/cal?pAction=rruleDelete";

var flg_USE_CATEGORIES = false;		//Event categories.  Not part of the iCalendar spec
var URL_RETRIEVE_CATEGORIES;	//e.g., 	var url = "/cal?pAction=GetRecords&q=/CAL/Calendar/sql/GetCalendarCategories.sql";

var calendar;
var flgFirstClick;
var editTemplate;
var createTemplate;
var rruleTemplate;
var calendarID;  //Must be set in the parent page
var DIV_ID="eventEdit";
var DIV_ID_C="eventCreate";
var RRULE_DIV_ID="divRRule";
var RRULE_Template = "RRule.htm";

var fmtDateTime =("YYYY/MM/DD HH:mm Z");
var fmtDisplay =("MM/DD/YYYY HH:mm");
var fmtDay = ("MM/DD/YYYY");
var fmtTime = ("h:mma");
var fmtFC = ("MM/DD/YYYY HH:mma");
var fmtICal = ("YYYYMMDD'T'HHmmss");

var ZERO_HOUR = "12:00am";

var globEvent;
//Minimum dimensions for event create/edit dialog
var minHeight="500";
var minWidth="700";
var evtCategoryData;     //Can be set in the enclosing page
var recurrenceRuleData;	//Can be set in the enclosing page

var rrIntervalOpts = {};
for(j=1;j<51;j++){
	rrIntervalOpts[j]=j;
}
var freqOpts = {'-- select frequency --':'','Days':'DAILY','Weeks':'WEEKLY','Months':'MONTHLY','Years':'YEARLY'};
var freqLabel = {'DAILY':'Days','WEEKLY':'Weeks','MONTHLY':'Months','YEARLY':'Years'}

function Evt(){
	var eventID;
	var repeatID;
	var start;
	var end;
	var startDate;
	var startTime;
	var endDate;
	var endTime;
	var allDay;
	var flgRepeating;
	var flgFirstEvt;
}

function RRule() {
	var rruleID;
	var rFrequencyCode;
	var rrUntil;
	var rrCount;
	var rrInterval;	
	var eventID;
}

function cancelRRule(){
	closeDialog( RRULE_DIV_ID);
	$('#flgRepeating').attr("checked",false);
	$("#editRepeat").hide();
}

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
function closeRRule(){
	closeDialog( RRULE_DIV_ID);
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
	// Send the event to the back end;
	var url = URL_CREATE_EVENT;

	if(!url){
		console.debug("URL_CREATE_EVENT not defined");
		exit;
	}
	f.action = url;
	var event;
	var id;
	var fLoad = function(data) {
		event = data;
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
	jqSubmit(f, true, fLoad);
	return id;
}

function createFCEventAndCloseDialog(f){
	var id = createFCEvent(f);
	if(! id) return false;
	closeDialog(DIV_ID_C);
}

function createFCEventShow(startDate, endDate, allDay) {

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
		var f = $("#" + formID)[0];
		if(! f.evtStartDate){
			setTimeout(fLoadCreate, 250);
			return;
		}

		initEventControls(evt);
		setButtons('CREATE');

	}
	opts.open = fLoadCreate;
	showDialog(divID,opts);
}

function createFCEventMinimal(startDate,endDate,allDay){
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
	var event;
	var id;
	var fLoad = function(data) {
		event = data;
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
	var jsonEvt = $.param(evt);
	var url = URL_CREATE_EVENT;
	if(!url){
		console.debug("URL_CREATE_EVENT not defined");
		return;
	}
	url += "&calendarID=" + calendarID;
	for (x in evt){
		url += "&" + x + "=" + evt[x];
	}
	url += "&evtStartString=" + evt.startString;
	url += "&evtEndString=" + evt.endString;
	url += "&evtAllDay=" + evt.allDay;
	url += "&evtTitle=" + "Please enter a title";

	//url += "&evt=" + jsonEvt;
	// var jqID = "#" + f.id;
	// $.post(url, $(jqID).serialize(), fLoad);
	njq.njq.jqGet(url, true, fLoad);
	flgMode = 'CREATE';
	editFCEvent(event,null,null,null,flgMode);

}

function createRRule(f) {
	// create a recurrence rule based on form data

	if(!f.rFrequencyCode.value){
		alert ("The frequency code field cannot be empty");
		return false;
	}
	// Send the event to the back end
	var url = URL_CREATE_RULE;
	if(!url){console.debug("URL_CREATE_RULE not defined");return}
	f.action = url;
	var event;
	var id;
	var fLoad = function(data) {
		event = data;
		// Times are passed through json as millisecond values.
		// These need to be converted into actual date objects.
		event.start = new Date(event.start);
		event.end = new Date(event.end);
		id = event.rruleID;
 		// render in the calendar
		calendar.fullCalendar('renderEvent', event, false // make the event
															// not "stick"
		);
	}
	// var jqID = "#" + f.id;
	// $.post(url, $(jqID).serialize(), fLoad);
	jqSubmit(f, true, fLoad);
	return id;
}

function createRRuleHdlr(f){
	var id = createRRule(f);
	if(!id) return false;
	closeRRule();

}

function createRRuleShow(evt){
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
	rrule = new RRule();
	rrule.eventID = evt.eventID;
	rrule.evtStart = evt.evtStart?evt.evtStart:evt.startDate;
	rrule.evtEnd = evt.evtEnd?evt.evtEnd:evt.endDate;

	var start = moment(evt.startDate + " " + evt.startTime, fmtFC);
	var startFmt = start.format(fmtDay);
	rrule['startFmt'] = startFmt;
	//setRRuleFields(rrule);
	
	var str = getRRuleTemplate();
	str = supplant(str, rrule);
	drr.html(str);

	 initRRuleControls(rrule,evt);


	$("#btnCreateRRule").show();
	$("#btnCancelCreateRRule").show();

	drr.dialog({title:'Edit Recurring Events',width:'600px',modal:true});
	
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
		  createFCEventMinimal(date,date,allDay);
	  }
	  if(view.name == 'agendaWeek'){
		  if(allDay){
			  calendar.fullCalendar('changeView', 'agendaDay').fullCalendar('gotoDate', date);
		  }
	  }
	  if(view.name == 'agendaDay'){
		  //if(! allDay) return;
		  createFCEventMinimal(date,date,allDay);  
	  }
	  else if(view.name == 'month'){
		  createFCEventMinimal(date,date,allDay);
		
		  //This would pop the agendaDay view
		  //calendar.fullCalendar('changeView', 'agendaDay')
	      //          .fullCalendar('gotoDate', date);
	      
	  }
	}

function deleteFCEvent(f,evt){
	var $f = (f instanceof jQuery)?f:$("#" + f.id);
	f = $f[0];
	if(!evt) evt = globEvent;
	var flgReload = evt.flgRepeating != null;
	if(evt.flgRepeating && !f.recUpdateMode.value){
	    $( "#dialog-delete-recurring" ).dialog({
	        resizable: true,
	        width:480,
	        modal: true,
	        buttons: [
    	          { text:"All events",
    	        	  "class": "dlg-button",
    	        	  click:function(){
    	        	  f.recUpdateMode.value = "ALL";
    		            $( this ).dialog( "close" );
    		            deleteFCEvent($f,evt); 
    	        	  }
    	          },
	    	   { text: "This event only",
	        	   "class": "dlg-button",
	        	   click: function() {
		        	  f.recUpdateMode.value = "EXTRACT";
		            $( this ).dialog( "close" );
		            deleteFCEvent($f,evt);
	        	   }
	          },
	          {text:"All events going forward",
	        	  "class": "dlg-button",
	        	  click:function(){
	        	  f.recUpdateMode.value = "FWD";
		            $( this ).dialog( "close" );
		            var data = $f.serialize();
		            deleteFCEvent($f,evt);
	        	  }
	          },

	          { text: "Cancel",
	        	  "class": "dlg-button",
	        	  click: function() {
	            $( this ).dialog( "close" );
	        	}
	          }
	        ]
	      });
	    return;
	}

	if(evt.flgRepeating && f.recUpdateMode.value == 'ALL' ){
		var msg = "All events in the series will be deleted.";
		msg += "\r\n Do you really want to delete this entire series?";
		if(!confirm(msg)) return false;
	}
	var url = URL_DELETE_EVENT;
	if(!url){console.debug("URL_DELETE_EVENT not defined");return;}
	f.action=url;
	var fLoad = function(data){
		var event = data;
		var id = event.id;
		if(flgReload){
			reloadCalendar();
		}
		else{
			calendar.fullCalendar('removeEvents', id );
		}
		closeEventEdit();
		};
	jqSubmit(f,false,fLoad);
}

function deleteRRule(evt){
	if(!evt.rruleID) return false;
	if(!confirm("Delete all recurring events related to this event?")) return false;

	var url = URL_DELETE_RULE;
	if(!url){console.debug("URL_DELETE_RULE not defined");return;}
	url += "&rruleID=" + evt.rruleID;
	url += "&eventID=" + evt.eventID;
	
	var fLoad = function(data){
		var event = evalJSON(data);
		var id = event.id;
		//calendar.fullCalendar('removeEvents', id );	
		};
	njq.jqGet(url,false,fLoad);
	evt.flgRepeating = false;
}

function dialogUpdateType(divID,f,fLoad){
    $( "#" + id ).dialog({
        resizable: true,
        width:480,
        modal: true,
        buttons: [
          { text:"All events",
        	  "class": "dlg-button",
        	  click: function(){
        		f.recUpdateMode.value = "ALL";
	            $( this ).dialog( "close" );
	            fLoad();
        	  }
          },
          { text:"This event only", 
        	  "class": "dlg-button",
        	click:function() {
        	  f.recUpdateMode.value = "EXTRACT";
            $( this ).dialog( "close" );
            fLoad();
        	}
          },
          {	text:"All events going forward",
        	  "class": "dlg-button",
        	  click:function(){
        		f.recUpdateMode.value = "FWD";
	            $( this ).dialog( "close" );
	            var data = $f.serialize();
	            fLoad();        	  
          }},
          { text: "Cancel", 
        	  "class": "dlg-button",
        	  click: function() {
        		  f.recUpdateMode.value= null;
        		  $( this ).dialog( "close" );
        	  }
          }
        ]
      });
}

function dropHdlr(event,dayDelta,minuteDelta,allDay,revertFunc) {

     if (allDay) {
        //alert("Event is now all-day");
    }else{
        //alert("Event has a time-of-day");
    }
    var repeatID = event.repeatID;
    if(repeatID){
    	var repeatID = repeatID.split(".")[1];
    	if(repeatID!=0){
    		alert("This event is part of a repeating series. Please use the event editor to adjust dates for this series.");
    		revertFunc();
    		return false;
    	}
    }

	//calendar.fullCalendar('updateEvent',event);
    //editFCEvent(event);
    updateEventTimes(event);
	if(event.flgRepeating){
		calendar.fullCalendar('updateEvent',event);
		reloadCalendar();
	}

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
	rrule.eventID = evt.eventID;

	if(!rrule) rrule = evt;
	var start = moment(evt.startdate + " " + evt.starttime, fmtFC);
	var startFmt = start.format(fmtDay);
	rrule['startFmt'] = startFmt;
	//setRRuleFields(rrule);
	
	var str = getRRuleTemplate();
	str = supplant(str, rrule);
	drr.html(str);
	initRRuleControls(rrule,evt);

	$("#btnUpdateRRule").show();
	$("#btnCancelRRule").show();

	drr.dialog({title:'Edit Recurring Events',width:'600px',modal:true});
	
}

function editFCEvent(evt, jsEvt, view, opts,flgMode) {
	var divID = DIV_ID;
	var formID = "frmEditEvent";
	if(!flgMode)flgMode = 'EDIT';
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
		opts.width = 700;
		opts.height = 560;
	}
	opts.title = "Event Details";
	
	//get the full calendarevent record
	var id = evt.id;
	evt = getCalendarEventRecord(evt);
	setEvtFields(evt);
	/*if(evt.flgRepeating && !evt.flgFirstEvt){
		if(!confirm("This is a repeating event. Do you want to update all events in this series? If not, you need to first make this into a separate event, then you can edit this event's properties.")){
			return false;
		}			
	}
	*/

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
		initEventControls(evt);
		setButtons(flgMode,evt);

		return false;
	}
	opts.open = fLoadEdit;
	opts.dialogClass = evt.className;
	showDialog(divID,opts);
  	
	//Return false to prevent automatic opening of the event.url
	return false;
}





function fixEventSend(event){
	//Runs once per received event
	//Fix the boolean value in allDay
	var val = event.allday;
	if(!val) val = event.allDay;
	if(val == 't'|| val == "true") event.allDay = true;
	else event.allDay = false;
	val = event.flgrepeating;
	if(val == 't' || val == "true") event.flgRepeating = true;
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




function getDay(myDate) {
	return (myDate.getMonth() + 1 + "/" + myDate.getDate() + "/" + myDate
			.getFullYear());
}

function getCalendarEventRecord(evt){
	//Get the full CalendarEvent record
	//Returns an event object with all the FullCalendar fields + all the app specific fields
	var eventID = evt.eventid;
	if(!eventID) eventID = evt.id;
	if(!URL_RETRIEVE_EVENT){
		console.debug("URL_RETRIEVE_EVENT not defined");
		return evt;
	}
	var url = URL_RETRIEVE_EVENT + "&eventID=" + eventID;
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
	njq.jqGet(url,true,fLoad);
	return evtC;	
}

function getCreateTemplate(){
	if(createTemplate) return createTemplate;
	var ts = new Date().getTime();
	var url=DIR_FC +"/CreateEvent.htm";
	url += "?" + ts;

	var tmp;
	var fLoad = function(data){
		tmp = data;
		createTemplate = tmp;
	}
	njq.jqGet(url,true,fLoad,null,'text');
	return createTemplate;
}

function getEditTemplate(eventID){
	if(editTemplate) return editTemplate;
	var ts = new Date().getTime();
	var url;
	url=DIR_FC +"/EditEvent.htm";
	url += "?_" + ts;
	var tmp;
	var fLoad = function(data){
		tmp = data;
		editTemplate = tmp;
	}
	njq.jqGet(url,true,fLoad,null,'text');
	return editTemplate;
}


function getRRule(rruleID){
	var rrule = new RRule();
	if(!rruleID) return null;
	var url = URL_RETRIEVE_RULE;
	if(!url){console.debug("URL_RETRIEVE_RRULE not defined");return;}
	
	url += "&rruleID=" + rruleID;
	var fLoad = function(data){
		var rec = data[0];
		//var mRRUntil = moment(rec.rruntil, fmtFC);
		var rrUntil = null;
		if(rec.rruntil){
			var mRRUntil = moment(rec.rruntil,fmtICal);
			rrUntil = mRRUntil.format(fmtDay);
		}
		rrule.rruleID = rec.rruleid;
		rrule.rFrequencyCode = rec.rfrequencycode;
		rrule.rrUntil = rrUntil;
		rrule.rrCount = rec.rrcount;
		rrule.rrInterval = rec.rrinterval;
	}
	njq.jqGet(url,true,fLoad);
	return rrule;
}

function getRRuleTemplate(){
	if(rruleTemplate) return rruleTemplate;
	var ts = new Date().getTime();
	var url=DIR_FC +"/"+ RRULE_Template;
	url += "?" + ts;

	var tmp;
	var fLoad = function(data){
		tmp = data;
		rruleTemplate = tmp;
	}
	njq.jqGet(url,true,fLoad,null,'text');
	return rruleTemplate;
}
function initEventControls(evt,f){
	//Setup the date fields
	//setDateTimeField(f);
	$(".datepicker").datepicker();
	$(".timepicker").timepicker({scrollDefaultTime:'09:00'});
	var ds = $("#evtStartDate");
	var ts = $("#evtStartTime");
	setDateRange(ds);
	setTimeRange(ts);

	ds.change(setDateRangeHdlr);
	ts.change(setTimeRangeHdlr);
	$('#evtAllDay').change(function(){
		setDateTimeField(this.form);
		setAllDayFields(this.checked);
	});

	$('#evtEndDate').change(function(event){
		evt.endDate = $(this).val();
	});	
	$('#flgRepeating').change(function(event){
		if(this.checked){
			createRRuleShow(evt);
			$("#editRepeat").show();
		}
		else{
			deleteRRule(evt);
			$("#editRepeat").hide();
		}
	});	
	$("#editRepeat").click(function(event){
		editRRule(evt);
	});

	
	$("#btnDeleteEvt").click(function(event){
		deleteFCEvent(this.form);
		return false;
	});
	
	if(evt.flgRepeating){
		$('#flgRepeating').prop('checked', true);
		$("#editRepeat").show();
	}
	
	setAllDayFields(evt.allDay);	
	//Load the event category select
	setEvtCategorySelect(evt);
	//Load the recurrenc rules
	setEvtRecurrenceSelect(evt);
	/*
	//Adjust page for repeated event
	if(evt.flgRepeating && evt.flgFirstEvt){
		$("#btnDeleteEvt").unbind("click");
		$("#btnDeleteEvt").click(function(event){
			var flgRepeating = true;
			var flgReload = true;
			deleteFCEvent(this.form,flgRepeating,flgReload);
			return false;
		});
	}

	if(evt.flgRepeating && !evt.flgFirstEvt){
		var recursionInfo = "This event is part of a repeating event. You cannot edit the start and end dates for this event here.";
		recursionInfo += "\r\nIf you would like to remove this particular date, or adjust the start and end dates for this particular event";
		recursionInfo += " you must first remove this event from the series using the Remove button.";
		$("#imgRecursionInfo").toggle();
		$("#imgRecursionInfo").attr("title",recursionInfo);
		$("#evtStartDate").attr("disabled","true");
		$("#evtEndDate").attr("disabled","true");
		$("#evtAllDay").attr("disabled","true");
		$("#btnDeleteEvt").unbind("click");
		$("#btnDeleteEvt").click(function(event){
			alert("This event is part of a repeating series.  To delete this event you must first remove it from the series using the Remove button.");
			return false;
		});
		
	}
	*/

}

function initRRuleControls(rrule,evt){
	//calc the interval defined by evtStart - evtEnd
	//Don't allow a frequency less than the evt period
	
	var ms = moment(evt.endDate + " " + evt.endTime,"MM/DD/YYYY HH:mm:ss").diff(moment(evt.startDate + " " + evt.startTime,"MM/DD/YYYY HH:mm:ss"));
	var msFmt = moment.utc(ms).format("HH:mm");
	var months = moment.duration(ms).months();
	var days = moment.duration(ms+1).days();
	var hours = moment.duration(ms+1).hours();
	var myFreqOpts = {'-- select frequency --':'','Days':'DAILY','Weeks':'WEEKLY','Months':'MONTHLY','Years':'YEARLY'};

	if(days>=4)  delete myFreqOpts.Days; //Remove 'Days' option
	if(days>=7){
		delete myFreqOpts.Weeks; //Remove 'Weeks' option
	}
	if(months>=1){
		//delete myFreqOpts.Months; //Remove 'Months' option
		delete myFreqOpts.Weeks;
		delete myFreqOpts.Days;
	}
	if(months>=6) delete myFreqOpts.Months;

	njq.setOptions("rFrequencyCode",myFreqOpts,rrule.rFrequencyCode);
	njq.setOptions("rrInterval",rrIntervalOpts,rrule.rrInterval);
	//$("#rFrequencyCode").val(rrule.rfrequencycode);
	//$("#rrInterval").val(rrule.rrinterval);
	$(".datepicker").datepicker();
	$("#rrCount").change(function(evt){
		$('#rrUntil').val("");
		$("#rrUntil").attr("disabled",true);
		$("input[name='rad_rrUntil'][value='count']").prop("checked",true);
	});
	$("#rrUntil").change(function(evt){
		$("#rrCount").val("");
		$("input[name='rad_rrUntil'][value='date']").prop("checked",true);
	
	});

	$("input[name='rad_rrUntil']").change(function(evt){
		var val = $(this).val();
		if(val == 'date'){
			$("#rrCount").val('');
			$("#rrCount").attr("value",null);
			$("#rrCount").attr("disabled",true);
			$('#rrUntil').removeAttr("disabled");
		}
		else if(val == 'count'){
			$('#rrUntil').val("");
			$("#rrUntil").attr("value",null);
			$("#rrUntil").attr("disabled",true);
			$('#rrCount').removeAttr("disabled");
		}
	});
	if(rrule.rrCount){
		$("input[name='rad_rrUntil'][value='count']").prop("checked",true);
		$('#rrUntil').attr("disabled","disabled");
	}
	else if(rrule.rrUntil){
		$("input[name='rad_rrUntil'][value='date']").prop("checked",true);
		$('#rrCount').attr("disabled",true);
	}
}

function loadCalendarCategories(evt){
	//Get the categories defined for calendar
	var url = URL_RETRIEVE_CATEGORIES;
	if(!url){console.debug("URL_RETRIEVE_CATEGORIES not defined");return;}
	url += "&calendarID=" + calendarID;
	var evtC;
	var val;
	var fLoad = function(data){
		var catRecs = data;
		evtCategoryData = catRecs;
	}
	njq.jqGet(url,true,fLoad);
}

function reloadCalendar(){
	//To refetch events
	    calendar.fullCalendar('removeEvents');
		calendar.fullCalendar('refetchEvents');  
}


function refreshPage(){
	document.location = document.location;
}

function removeFCEventFromSeries(f){
	if(!confirm("Remove this event from the repeated series?")) return false;
	var url="cal?pAction=eventRemoveFromSeries";
	f.action=url;
	var fLoad = function(data){
		reloadCalendar();
		closeEventEdit();
	}
	jqSubmit(f,true,fLoad);
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
		createFCEventMinimal(start, end, allDay);
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

function setAllDayFields(flg){
	if(flg){
		$('.timepicker').hide();
		//$('#divEvtEndDate').hide();
		$('#evtAllDay').prop('checked', true);
	}
	else{
		$('.timepicker').show();
	}
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
	if(!flg_USE_CATEGORIES){ return;}
	if(!evtCategoryData)loadCalendarCategories();
	
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
	/*
	 * If this is a standard record, evt.start and evt.startdate will line up.
	 * If not, if this is part of a recurring event sequence, evt.start is the start of the current instance, and evt.startdate is 
	 * the date of the original entry in the sequence.
	 *
	 */
	var flgRepeating = evt.rruleid != null;
	var flgFirstEvt = false;
	var evtIDX = 0;
	var repeatID = null;
	if(flgRepeating){
		repeatID = evt.repeatID;  //synthetic, looks like 123234.0, 123234.1, etc.
		var n = repeatID + "";
		evtIDX = n.split(".")[1];
		//doh!  following returns 0.0993993912919 etc
		//evtIDX = repeatID - (Math.floor(repeatID));
		if(evtIDX == 0) flgFirstEvt = true;
	}
	var startDate, endDate;
	var startDisplay,endDisplay,startString,endString;
	
	var startDate = moment(evt.start);
	var endDate = moment(evt.end);
	var startDisplay, endDisplay;
	var startString,endString;

	//Adjust for repeating events
	evt.flgRepeating = flgRepeating;
	evt.flgFirstEvt = flgFirstEvt;
	if(flgRepeating && !flgFirstEvt){
		startDate = moment(evt._start);
		if(evt._end) endDate = moment(evt._end);
		else endDate = startDate;
	}
	
	startDisplay = startDate.format(fmtDisplay);
	startString = startDate.format(fmtDateTime);
	evt.startString = encodeURIComponent(startString);  //preserve the '+' in TimeZone designations
	evt.startDisplay = startDisplay;
	evt.startTime = startDate.format(fmtTime);
	evt.startDate = startDate.format(fmtDay);

	if(endDate){
		endString = endDate.format(fmtDateTime);
		endDisplay = endDate.format(fmtDisplay);
		evt.endTime = endDate.format(fmtTime);
		evt.endDate = endDate.format(fmtDay);
		evt.endString = encodeURIComponent(endString);
		evt.endDisplay = endDisplay;
	}
	evt.day = getDay(evt.start);

}

function setDateRange(dateObj){
	//dateObj is a jquery ui datepicker
	var endDateObj = $("#evtEndDate");
	var startDate = dateObj.val();
	var d = new Date(startDate);
	var mm = new moment(d);
	mm.add('month',2);
	$("#evtEndDate").datepicker("option","minDate",d);
	$("#evtEndDate").datepicker("option","maxDate",mm.toDate());
	
}function setDateRangeHdlr(evtObj){
	//evtObj is a javascript UI event
	//Fired after a date picker is changed
	// 'this' is evtStartDate
	setDateRange($(this));
}

function setTimeRange(timeObj){
	//timeObj is a timepicker object
	var end = $("#evtEndTime");
	var start = $("#evtStartTime");
	var startTime = timeObj.value;
	var startInt = start.timepicker('getSecondsFromMidnight');
	var endInt = end.timepicker('getSecondsFromMidnight');
	var delta = endInt - startInt;
	if(!delta || delta < 0) delta = 1800;
	end.timepicker('option', 'minTime', startInt);
	var newEnd = (startInt+delta)%86400;
	end.timepicker('setTime', newEnd);
}

function setTimeRangeHdlr(evtObj){
	//evtObj is a javascript UI event
	//Fired after a time picker is changed
	// 'this' is evtStarttime
	setTimeRange($(this));
}

function setDateTimeField(f){
	//var f = el.form;
	var dateStart = f.evtStartDate.value;
	var dateEnd = f.evtEndDate.value;
	var timeStart = f.evtStartTime.value;
	var timeEnd = f.evtEndTime.value;
	var flgAllDay = f.evtAllDay.checked;
	if(flgAllDay){
		timeStart = ZERO_HOUR;
		timeEnd = ZERO_HOUR;
	}
	
	var start = moment(dateStart + " " + timeStart, fmtFC);
	var end = moment(dateEnd + " " + timeEnd, fmtFC);
	var zone = start.zone();
	f.evtStart.value = start.valueOf();
	f.evtEnd.value = end.valueOf();
	f.evtStartString.value=start.format(fmtDateTime);
	f.evtEndString.value=end.format(fmtDateTime);
	f.dateTimeString.value = dateStart+ " " + timeStart + "-" + dateEnd + " " + timeEnd;
}

function setButtons(mode,evt){

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




function updateEventTimes(evt){
	var start = moment(evt.start);
	var end = moment(evt.end);
	var evtAllDay = evt.allDay?1:0;
	if(!end) end = start;
	var url = URL_UPDATE_EVENT;
	if(!url){
		console.debug("URL_UPDATE_EVENT not defined");
		return evt;
	}
	url += "&eventID=" + evt.id;
	url += "&calendarID=" + evt.calendarid;
	url +="&evtStartString=" + start.format(fmtDateTime);
	url +="&evtEndString=" + end.format(fmtDateTime);
	url += "&evtAllDay=" + evtAllDay;
	url +="&flgUpdate=true";
	njq.jqGet(url,true,null);
}

function updateAndCloseEvent(f){
	updateFCEvent(f);
	closeEventEdit();
	reloadCalendar();  //To refetch in case of repeating events
	return false;
}

function updateFCEvent(f,evt){
	if(!f){
		editFCEvent(evt);
	}
	var $f = (f instanceof jQuery)?f:$("#" + f.id);
	f = $f[0];
	if(!evt) evt = globEvent;
	if(evt.flgRepeating && !f.recUpdateMode.value){
	    $( "#dialog-update-recurring" ).dialog({
	        resizable: true,
	        width:480,
	        modal: true,
	        buttons: [
	          { text:"All events",
	        	  "class": "dlg-button",
	        	  click: function(){
	        		f.recUpdateMode.value = "ALL";
		            $( this ).dialog( "close" );
		            updateFCEvent($f,evt);
	        	  }
	          },
	          { text:"This event only", 
	        	  "class": "dlg-button",
	        	click:function() {
	        	  f.recUpdateMode.value = "EXTRACT";
	            $( this ).dialog( "close" );
	            updateFCEvent($f,evt);
	        	}
	          },
	          {	text:"All events going forward",
	        	  "class": "dlg-button",
	        	  click:function(){
	        		f.recUpdateMode.value = "FWD";
		            $( this ).dialog( "close" );
		            var data = $f.serialize();
		            updateFCEvent($f,evt);        	  
	          }},
	          { text: "Cancel", 
	        	  "class": "dlg-button",
	        	  click: function() {
	        		  $( this ).dialog( "close" );
	        	  }
	          }
	        ]
	      });
	    return;
	}

	//Update evtStart and evtEnd
	setDateTimeField(f);

	var evtObj = f.evtObject;
	if(!evtObj){
		evtObj = {id:'evtObject'};
		$f.append(evtObj);
	}
	for(k in globEvent){
		var v = globEvent[k];
		evtObj[k] = v;
	}
	var url = URL_UPDATE_EVENT;
	f.action=url;
	//TODO
	var fLoad = function(data){
		var event = data;
		if(evt.flgRepeating){
			reloadCalendar();
			return;
		}
		var k,v;
		for(k in event){
			v = event[k];
			evt[k] = v;
		}
		evt.start = new Date(event.start);
		evt.end = new Date(event.end);
		if(evt.allDay) evt.end = null;
		// Event styles
		evt.className = "event" + event.categoryCode;

		calendar.fullCalendar('updateEvent',evt);
		//calendar.fullCalendar('renderEvent', event, true );	
		};
	jqSubmit($f,true,fLoad);
	return evt;
}

function updateRRule(f) {
	// update a recurrence rule based on form data

	if(!f.rFrequencyCode.value){
		alert ("The frequency code field cannot be empty");
		return false;
	}
	// Send the event to the back end
	var url = URL_UPDATE_RULE;
	if(!url){console.debug("URL_UPDATE_RULE not defined");return;}
	f.action = url;
	var event;
	var id;
	var fLoad = function(data) {
		event = data;
		// Times are passed through json as millisecond values.
		// These need to be converted into actual date objects.
		event.start = new Date(event.start);
		event.end = new Date(event.end);
 		// render in the calendar
		calendar.fullCalendar('renderEvent', event, false // make the event
															// not "stick"
		);
		id = event.id;
		closeRRule();
		closeEventEdit();
		reloadCalendar();
	}
	// var jqID = "#" + f.id;
	// $.post(url, $(jqID).serialize(), fLoad);
	jqSubmit(f, true, fLoad);
	return id;
}


