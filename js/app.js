//洗牌
Array.prototype.shuffle = function(){
	var i = this.length, j, temp;
	if ( i == 0 ) return this;
	while ( --i ) {
		j = Math.floor( Math.random() * ( i + 1 ) );
		temp = this[i]; this[i] = this[j]; this[j] = temp;
	}
	return this;
}

{
	// SETUP: Table backgrounds
	var gGameTableBkgds = {};
	gGameTableBkgds.pattern = { url:'img/table_pattern.jpg' };
	gGameTableBkgds.circles = { url:'img/table_circles.jpg' };
	gGameTableBkgds.felt    = { url:'img/table_felt.jpg'    };
	gGameTableBkgds.plain   = { url:'img/table_plain.png'   };

	// SETUP: Game Options / Defaults
	var gGameOpts = {};
	gGameOpts.allowFounReuse = false;
	gGameOpts.cheatUnlimOpen = false;
	gGameOpts.debugOneLeft   = false;
	gGameOpts.showTips       = true;
	gGameOpts.sound          = true;
	gGameOpts.tableBkgdUrl   = gGameTableBkgds.pattern.url;

	// SETUP: Define / Start async load of sounds files
	// NOTE: iOS (as of iOS9) is unable to play ogg files, so we are using MP3 for everything
	var gGameSounds = {};
	gGameSounds.cardFlip    = { buffer:null, url:'sounds/cardFlip.mp3',    src:'freesound.org/people/f4ngy/sounds/240776/'    };
	gGameSounds.cardShuffle = { buffer:null, url:'sounds/cardShuffle.mp3', src:'freesound.org/people/deathpie/sounds/19245/'  };
	gGameSounds.crowdCheer  = { buffer:null, url:'sounds/crowdCheer.mp3',  src:'soundbible.com/1700-5-Sec-Crowd-Cheer.html'   };
	gGameSounds.sadTrombone = { buffer:null, url:'sounds/sadTrombone.mp3', src:'freesound.org/people/Benboncan/sounds/73581/' };
}

var CARD_OFFSET = 50;
var CARD_DECK = {
			suits: [
				{ name:'club',    logo:'♣' },
				{ name:'diamond', logo:'♦' },
				{ name:'heart',   logo:'♥' },
				{ name:'spade',   logo:'♠' }
			],
			cards: [
				{ name:'ace',   numb:'A',  class:'suit' },
				{ name:'two',   numb:'2',  class:'suit' },
				{ name:'three', numb:'3',  class:'suit' },
				{ name:'four',  numb:'4',  class:'suit' },
				{ name:'five',  numb:'5',  class:'suit' },
				{ name:'six',   numb:'6',  class:'suit' },
				{ name:'seven', numb:'7',  class:'suit' },
				{ name:'eight', numb:'8',  class:'suit' },
				{ name:'nine',  numb:'9',  class:'suit' },
				{ name:'ten',   numb:'10', class:'suit' },
				{ name:'jack',  numb:'J',  class:'face' },
				{ name:'queen', numb:'Q',  class:'face' },
				{ name:'king',  numb:'K',  class:'face' }
			]
		};
var SUIT_DICT = {
			club:    { color:'b', accepts:['diamond', 'heart'] },
			diamond: { color:'r', accepts:['club'   , 'spade'] },
			heart:   { color:'r', accepts:['club'   , 'spade'] },
			spade:   { color:'b', accepts:['diamond', 'heart'] }
		};
var NUMB_DICT = {
			A: { cascDrop:''  , founDrop:'2' },
			2: { cascDrop:'A' , founDrop:'3' },
			3: { cascDrop:'2' , founDrop:'4' },
			4: { cascDrop:'3' , founDrop:'5' },
			5: { cascDrop:'4' , founDrop:'6' },
			6: { cascDrop:'5' , founDrop:'7' },
			7: { cascDrop:'6' , founDrop:'8' },
			8: { cascDrop:'7' , founDrop:'9' },
			9: { cascDrop:'8' , founDrop:'10'},
			10:{ cascDrop:'9' , founDrop:'J' },
			J: { cascDrop:'10', founDrop:'Q' },
			Q: { cascDrop:'J' , founDrop:'K' },
			K: { cascDrop:'Q' , founDrop:''  }
		};
function gameStart(){

	$('.placement-table > div > div').droppable({
		//接受的元素
		accept:     '.card',
		//抓起來的效果
		hoverClass: 'cascHover',
		//draggable 對 droppable的位置，touch:draggable touch droppable, pointer:mouse touch droppable
		tolerance:  'pointer',
		drop:       function(event,ui){ handleFounDrop(event, ui, $(this)); }
	});
	$('.temporary-table > div > div').droppable({
		accept:     '.card',
		hoverClass: 'cascHover',
		tolerance:  'pointer',
		drop:       function(event,ui){ handleOpenDrop(event, ui, $(this)); }
	});
	$('.card-table > div > div').droppable({
		accept:     '.card',
		hoverClass: 'cascHover',
		tolerance:  'pointer',
		drop:       function(event,ui){ handleCascDrop(event, ui, $(this)); }
	});

	$('#dialogYouWon').dialog({
		modal: true,
		autoOpen: false,
		draggable: false,
		resizable: false,
		dialogClass: 'dialogCoono',
		closeOnEscape: false,
		width: ($(window).innerWidth() * 0.6),
		height: (($(window).innerHeight() * 0.55))
	});
}		

function handleCascDrop(event, ui, drop) {
	
	var topCard = $(drop).children().last();
	//draggingContainer??
	var card = ( ui.helper.prop('id') == 'draggingContainer' ) ? ui.helper.children()[0] : ui.draggable;
	var cards = ( ui.helper.prop('id') == 'draggingContainer' ) ? ui.helper.children() : [ui.draggable];
	// RULE 1: Is the single-card/container-top-card in run order?
	if ( $(drop).children().length > 0
		//$.inArray 返回index 找不到就返回-1
		 && ( $.inArray($(topCard).data('suit'), SUIT_DICT[$(card).data('suit')].accepts) == -1
			|| NUMB_DICT[$(topCard).data('numb')].cascDrop != $(card).data('numb') )
	) {
		if ( gGameOpts.showTips ) null; // TODO
		return false;
	}

	// STEP 2: "Grab" card(s) and place them into this cascade
	$.each(cards, function(i,obj){
		// NOTE: ui.helper.children()[0] != ui.draggable (!!!) - you can call .draggable() on the ui ene but not on the array element!!
		// ....: Correct way is to call object directly using its id - reference does not work
		var card = $('#'+$(obj).prop('id'));
		
				// A: Remove revert or the card flyback animation will run (yes, even with code below that deatches it!)
		card.draggable('option', 'revert', false);//false?
		// B: "Grab"/Detach/Append CARD
		var intTop = ( $(drop).children().length > 0 )
			? Number($(drop).children().last().css('top').replace('px','')) - ($('.card:first-child').height() - CARD_OFFSET) : 0;
		//ui.draggable.hide().detach().appendTo(drop).show('fast').removeAttr('style'); // NOTE: Remove style is a small fix for jquery-ui oddness
		card.detach().appendTo(drop).removeAttr('style'); // NOTE: Remove style is a small fix for jquery-ui oddness
		// C: Unhide the card that we hid when we built draggable container
		card.find('span').css('visibility','visible'); // IMPORTANT: the cool cards we use have spans that must be set on their own
		// D: Fix positioning CSS
		card.css({ 'position':'relative', 'left':'-3px', 'top':intTop-3+'px', 'z-index':'' });
		// E: Reset draggable params (REQD here as we need to turn revert back on)
		console.log(intTop);
		card.draggable({
			helper: cascHelper,
			start : function(event, ui){ $(this).draggable('option', 'revert', true); }
		});
	});

	// STEP 3: Shorten fanning padding if card stack grows too large
	// TODO: measure #playArea and length of children
}
function handleFounDrop(event, ui, drop) {
	// DOCS: "$(this) [drop] represents the droppable the draggable is dropped on. ui.draggable represents the draggable"
	// NOTE: jQuery UI draggables will revert no matter what (even if we func accept:ARG and return true/fasle), so revert:false is reqd!

	// RULE 1: Was only a single card provided?
	if ( ui.helper.children().length != 1 ) {
		if ( gGameOpts.showTips ) null; // TODO
		return false;
	}

	// RULE 2: Is card valid?
	if ( drop.children('.card').length == 0 ) {
		if ( ui.draggable.data('numb') != 'A' ) {
			if ( gGameOpts.showTips ) null; // TODO
			return false;
		}
	}
	else {
		var card = $(ui.draggable);
		var topCard = $(drop.children('.card').last());

		// Is card next in sequence?
		if ( topCard.data('suit') != card.data('suit') || NUMB_DICT[topCard.data('numb')].founDrop != card.data('numb') ) {
			if ( gGameOpts.showTips ) null; // TODO
			return false;
		}
	}

	// ------------------------------------------------------------------------

	// STEP 2: "Grab" card and place it into this foundation
	{
		// A: Remove revert or the card flyback animation will run (yes, even with code below that deatches it!)
		ui.draggable.draggable('option', 'revert', false);
		// B: "Grab"/Deatch/Append CARD
		ui.draggable.detach().appendTo( $(drop) ).removeAttr('style'); // NOTE: Remove style is a small fix for jquery-ui oddness
		// C: Unhide the card that we hid when we built draggable container
		ui.draggable.find('span').css('visibility','visible'); // IMPORTANT: the cool cards we use have spans that must be set on their own
		// D: Reset z-index to mid-level
		ui.draggable.css('z-index', $(drop).find('.card').length);
		// E: "Stack" all cards by using position (0,0)
		ui.draggable.css({ position:'absolute', top:'-3px', left:'-3px' });
	}

	// STEP 3: Apply options
	if ( !gGameOpts.allowFounReuse ) {
		ui.draggable.draggable('disable');
		ui.draggable.css('cursor','default');
	}

	// STEP 4: CHECK: End of game?
	if ( $('.placement-table .card').length == 52 ) doGameWon();
}

function handleOpenDrop(event, ui, drop) {
	// -------------------------------------------

	// RULE 1: Was only a single card provided?
	if ( ui.helper.children().length != 1 ) {
		if ( gGameOpts.showTips ) null; // TODO
		return false;
	}

	// -------------------------------------------

	// STEP 2: "Grab" card and place it into this slow
	// A: Remove revert or the card flyback animation will run (yes, even with code below that deatches it!)
	ui.draggable.draggable('option', 'revert', false);
	// B: "Grab"/Detach/Append CARD
	ui.draggable.detach().appendTo(drop).removeAttr('style'); // NOTE: Remove style is a small fix for jquery-ui oddness
	// C: Unhide the card that we hid when we built draggable container
	ui.draggable.find('span').css('visibility','visible'); // IMPORTANT: the cool cards we use have spans that must be set on their own
	// D: Fix positioning CSS
	ui.draggable.css('top', '-3px');
	ui.draggable.css('left', '-3px');
	// E: Reset z-index to mid-level (use 99 so we're above any 500 but always under card which drags at 100)
	ui.draggable.css('z-index',99);

	// STEP 3: Turn off this slot until it frees up again
	if ( !gGameOpts.cheatUnlimOpen ) drop.droppable('disable');
	else $.each(drop.children('.card'), function(i,card){ $(card).css('position','relative').css('top',i*-1*($(card).height()-20)+'px').css('left','0px');});

	// STEP 4: Reset draggable params (esp. helper as prev one from cascades does things we no longer want to do)
	var strNeeded = $(drop).attr('id');
	ui.draggable.draggable({
		helper: 'original',
		start: function(event, ui){
			$(this).css('z-index', 100);
			$(this).draggable('option', 'revert', true);
			$('#'+strNeeded).droppable('enable');
		},
	});
}

function doFillBoard() {
	var arrCards = [];
	var strHtml = '';

	// STEP 2: Build cards
	$('.card').remove();
	$.each(CARD_DECK.suits, function(i,suit){
		$.each(CARD_DECK.cards, function(j,card){
			// A:
			var objNode = $('<div id="card'+ suit.name.substring(0,1) + card.numb +'" class="card" '
				+ ' data-suit="'+suit.name+'" data-numb="'+card.numb+'">'
				+ '<div class="card-'+card.name+' '+suit.name+'">'
				+ '<div class="corner top">'
				+ '<span class="number'+ (card.numb == '10' ? ' ten':'') +'">'+card.numb+'</span><span>'+suit.logo+'</span></div>'
				+ (card.class == 'suit'
					? '<span class="suit top_center">'+suit.logo+'</span><span class="suit bottom_center">'+suit.logo+'</span>'
					: '<span class="face middle_center"><img src="img/faces/face-'+card.name+'-'+suit.name+'.png"></span>'
				)
				+ '<div class="corner bottom">'
				+ '<span class="number'+ (card.numb == '10' ? ' ten':'') +'">'+card.numb+'</span><span>'+suit.logo+'</span></div>'
				+ '</div>'
				+ '</div>');
			// B:
			arrCards.push( objNode );
		});
	});

	// STEP 3: Shuffle / Deal cards into tableau, fanned style
	var intCol = 1, intTop = 0;
	if ( gGameOpts.debugOneLeft ) {
		$.each(arrCards, function(i,card){
			if      (i < 13) $('#placement-1').append( card.css('position','absolute').animate({ left:0, top:0 }, (i*1000/52)) );
			else if (i < 26) $('#placement-2').append( card.css('position','absolute').animate({ left:0, top:0 }, (i*1000/52)) );
			else if (i < 39) $('#placement-3').append( card.css('position','absolute').animate({ left:0, top:0 }, (i*1000/52)) );
			else if (i < 51) $('#placement-4').append( card.css('position','absolute').animate({ left:0, top:0 }, (i*1000/52)) );
			else             $('#placement-1').append( card.css('position','absolute').animate({ left:0, top:0 }, (i*1000/52)) );
		});
	}
	else {
		$.each(arrCards.shuffle(), function(i,card){
			// NOTE: Set on the element itself (using a class with these values will not work)
			card.css('position','relative');
			card.css('top','-3px')
			

			// Append CARD using animation
			$('#table-'+intCol).append( card.animate({ left:-3, top:-3-($('#table-'+intCol+' .card').length * ($('.card:first-child').height()-CARD_OFFSET)) + 'px' }, (i*1000/52) ) );

			// Fill cascade cols in round-robin order
			if (intCol>=7) { intCol = 0; intTop = 0; }
			intCol++
		});
	}

	// STEP 4: Draggable setup
	$('.card')
	.draggable({
		helper: cascHelper,
		revert: true,
		start : handleDragStart,
		stop  : handleDragStop
	})
	.dblclick(function(){
		//handleCardDblClick($(this));
	});

	// STEP 5: Adjust card fanning offset
	//doRespLayout();
}
		

function doRespLayout() {
	// STEP 1: Responsive Setup
	doRespConfig();

	// STEP 2: Re-fan cards to handle varying offsets as resizes occur
	$('#cardCasc > div').each(function(i,col){
		$(col).find('.card').each(function(idx,card){ $(card).css('top','-'+(idx*($('.card:first-child').height()-CARD_OFFSET))+'px'); });
	});
}

function doGameWon() {
	// FYI: pulsing CSS text (http://jsfiddle.net/thirtydot/aDZLy/)
	var intDelay = 500;

	// STEP 2:
	$('#dialogYouWon').dialog('open');
	console.log('boom');

	// STEP 3:
	/*for (var idx=12; idx>=0; idx--){
		$('.card[data-numb='+CARD_DECK.cards[idx].numb+']').each(function(i,card){
			$(card).animate( {left:( Math.floor(Math.random()*12) * 100 )+'px', top:($(window).innerHeight()*1.1)+'px'}, (intDelay += 100), function(){$(this).remove();} );
		});
	}*/
}

function handleDragStart(event, ui){
	var prevCard;

	// RULE 1: If a group is being dragged, then vallidate the sequence, otherwise, dont allow drag to even start
	if ( ui.helper.prop('id') == 'draggingContainer' && ui.helper.children().length > 1 ) {
		for (var idx=0; idx<ui.helper.children().length; idx++) {
			var card = ui.helper.children()[idx];
			// Just capture first card, then start checking seq
			if ( idx > 0 ) {
				if ( $.inArray($(card).data('suit'), SUIT_DICT[$(prevCard).data('suit')].accepts) == -1
					|| NUMB_DICT[$(prevCard).data('numb')].cascDrop != $(card).data('numb')
				) {
					// Disallow drag start
					handleDragStop(event, ui);
					return false;
				}
			}
			prevCard = card;
		}
	}

	// RULE 2: Ensure enough free slots existing to ahndle number of cards being dragged
	/*if ( ui.helper.prop('id') == 'draggingContainer' && ui.helper.children().length > 1 ) {
		if ( (ui.helper.children().length - 1) > (4 - $('.temporary-table .card').length) ) {
			if ( gGameOpts.showTips ) null; // TODO
			// Disallow drag start
			handleDragStop(event, ui);
			return false;
		}
	}*/
}

function handleDragStop(event, ui){
	// STEP 1: Re-display hidden/cloned cards on revert (or orig one being dragged shows)
	$('.card-table div, .card-table span').show().css('visibility', 'visible');
}

function handleStartBtn() {

	// STEP 3: Fill board
	doRespConfig();
	doFillBoard();
}

function cascHelper() {
	// A: Build container and fill with cards selected
	var container = $('<div/>').attr('id', 'draggingContainer').addClass('cardCont');
	container.css( 'position', 'absolute' );
	container.css( 'z-index', '100' );
	container.css( 'top' , $(this).offset().top +'px' );
	container.css( 'left', $(this).offset().left+'px' );
	container.append( $(this).clone() );
	container.append( $(this).nextAll('.card').clone() );

	// B: Hide original cards
	$(this).css('visibility','hidden'); // IMPORTANT: Dont hide() this or container jumps to {0,0} (jQuery must be using .next or whataver)
	$(this).find('span').css('visibility','hidden'); // IMPORTANT: the cool cards we use have spans that must be set on their own
	$(this).nextAll().hide();

	// C: "Cascade" cards in container to match orig style
	// REQD! We have to do this as we use negative margins to stack cards above, else they'll go up in this container and look all doofy
	container.find('div.card').each(function(i,ele){ $(this).css('position', 'absolute').css('top', (i*CARD_OFFSET)+'px'); });

	// LAST:
	return container;
}

$(document).ready(function(){ 
	gameStart(); 
	doFillBoard();
	})
