$( document ).ready(function() {
	var yasr = YASR(document.getElementById("results"));
	
	YASQE(document.getElementById("sparql"), {
		value: "PREFIX ll: <http://lodlaundromat.org/vocab#>\n"+
			"PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n"+
		"SELECT DISTINCT ?properties ?classes WHERE {\n"+
		"	{[] a ?classes}\n"+
		"	UNION\n"+
		"	{[] ?properties ?x}\n"+
		"}",
		sparql: {
			defaultGraphs: [sparql.mainGraph],
			showQueryButton: true,
			endpoint: sparql.url,
			handlers: {
				error: function(xhr, textStatus, errorThrown) {
					yasr.setResponse({exception: textStatus + ": " + errorThrown});
				},
				success: function(data, textStatus, xhr) {
					yasr.setResponse({response: data, contentType: xhr.getResponseHeader("Content-Type")});
				}
			}
		}
	});
	
	
});
