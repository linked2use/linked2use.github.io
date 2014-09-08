var recordsTotal;

$.ajax({
    data: [
           {name: "default-graph-uri", value: sparql.mainGraph},
           {name: "default-graph-uri", value: sparql.basketGraph},
           {name: "query", value: sparql.queries.totalWardrobeContents},
    ],
    headers: {
      "Accept": "application/json"
    },
    success: function(data) {
      if (data.results.bindings.length > 0) {
    	  recordsTotal = data.results.bindings[0].total.value;
    	  
    	  
    	  $(document).ready(function() {
		    $('#example').dataTable( {
		        "processing": true,
		        "serverSide": true,
		        "ajax": $.fn.dataTable.pipeline(),
		        "drawCallback": function ( oSettings ) {
		      	  $('.longtitle').tooltip();
		        },
		        "columns": [
                    {//URL
			        	"render": function ( oObj ) {
			        		return "<span class='longtitle' data-toggle='tooltip' data-placement='top' title='" + oObj + "'>" + shortenUrl(oObj) + "</span>";
			        	}
		        	},
                    {//MD5
		        		visible: false
                    },
		        	{//triples
                    	
		        	}
		        ]
		    }).fnFilterOnReturn();
		} );
    	  
      }
    },
    url: sparql.url
});




//
// Pipelining function for DataTables. To be used to the `ajax` option of DataTables
//
$.fn.dataTable.pipeline = function ( opts ) {
    // Configuration options
    var conf = $.extend( {
        pages: 5,     // number of pages to cache
        url: sparql.url,      // script url
        data: function(request) {
        	return {
        		query: sparql.queries.wardrobeListing(request.draw, request.order, request.start, request.length, request.search.value)
        	};
        },
        method: 'GET' // Ajax HTTP method
    }, opts );
//    console.log(opts);
 
    // Private variables for storing the cache
    var cacheLower = -1;
    var cacheUpper = null;
    var cacheLastRequest = null;
    var cacheLastJson = null;
 
    return function ( request, drawCallback, settings ) {
//    	console.log(request);
        var ajax          = false;
        var requestStart  = request.start;
        var drawStart     = request.start;
        var requestLength = request.length;
        var requestEnd    = requestStart + requestLength;
         
        if ( settings.clearCache ) {
            // API requested that the cache be cleared
            ajax = true;
            settings.clearCache = false;
        }
        else if ( cacheLower < 0 || requestStart < cacheLower || requestEnd > cacheUpper ) {
            // outside cached data - need to make a request
            ajax = true;
        }
        else if ( JSON.stringify( request.order )   !== JSON.stringify( cacheLastRequest.order ) ||
                  JSON.stringify( request.columns ) !== JSON.stringify( cacheLastRequest.columns ) ||
                  JSON.stringify( request.search )  !== JSON.stringify( cacheLastRequest.search )
        ) {
            // properties changed (ordering, columns, searching)
            ajax = true;
        }
         
        // Store the request for checking next time around
        cacheLastRequest = $.extend( true, {}, request );
 
        if ( ajax ) {
            // Need data from the server
            if ( requestStart < cacheLower ) {
                requestStart = requestStart - (requestLength*(conf.pages-1));
 
                if ( requestStart < 0 ) {
                    requestStart = 0;
                }
            }
             
            cacheLower = requestStart;
            cacheUpper = requestStart + (requestLength * conf.pages);
 
            request.start = requestStart;
            request.length = requestLength*conf.pages;
 
            // Provide the same `data` options as DataTables.
            if ( $.isFunction ( conf.data ) ) {
                // As a function it is executed with the data object as an arg
                // for manipulation. If an object is returned, it is used as the
                // data object to submit
                var d = conf.data( request );
                if ( d ) {
                    request = d;
                }
            }
            else if ( $.isPlainObject( conf.data ) ) {
                // As an object, the data given extends the default
                $.extend( request, conf.data );
            }
 
            settings.jqXHR = $.ajax( {
                "type":     conf.method,
                "url":      conf.url,
                "data":     request,
                "dataType": "json",
                "cache":    false,
                "success":  function ( sparqlResult ) {
                	var json = sparqlResultToDataTable(sparqlResult);
                    cacheLastJson = $.extend(true, {}, json);
                    
                    if ( cacheLower != drawStart ) {
                        json.data.splice( 0, drawStart-cacheLower );
                    }
                    json.data.splice( requestLength, json.data.length );
                     
                    drawCallback( json );
                }
            } );
        }
        else {
            json = $.extend( true, {}, cacheLastJson );
            json.draw = request.draw; // Update the echo for each response
            json.data.splice( 0, requestStart-cacheLower );
            json.data.splice( requestLength, json.data.length );
 
            drawCallback(json);
        }
    };
};
 
// Register an API method that will empty the pipelined data, forcing an Ajax
// fetch on the next draw (i.e. `table.clearPipeline().draw()`)
$.fn.dataTable.Api.register( 'clearPipeline()', function () {
    return this.iterator( 'table', function ( settings ) {
        settings.clearCache = true;
    } );
} );

var sparqlResultToDataTable = function(sparqlResult) {
	var datatable = {
		recordsTotal: recordsTotal,
		data: [],
		
	};
	for (var i = 0; i < sparqlResult.results.bindings.length; i++) {
		var row = [];
		datatable.draw = sparqlResult.results.bindings[i].drawId.value;//same for all results though
		datatable.recordsFiltered = sparqlResult.results.bindings[i].totalFilterCount.value;//same for all results though
		
		//while we are at it, do some post processing as well
		//urlCell = "<strong>bla</strong>";
//		var urlCell = "<span class='longtitle' data-toggle='tooltip' data-placement='top' title='" + url + "'>" + shortenUrl(url) + "</span><div class='md5'>" + md5 + "</div>";
		row.push(sparqlResult.results.bindings[i].url.value);
		row.push(sparqlResult.results.bindings[i].md5.value);
		var triples = null;
		if (sparqlResult.results.bindings[i].triples && sparqlResult.results.bindings[i].triples.value) {
			triples = sparqlResult.results.bindings[i].triples.value;
		}
		row.push(triples);
		datatable.data.push(row);
		
	}
	return datatable;
};
