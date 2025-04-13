//this function will take a list of names and make it into a dropdown
function dropDown(data) {
    //this will check if 'data' is empty or not. if empty then below is default data
    //this part is just for checking
    if (data === undefined || data.length == 0){
        data.push("1st choice");
        data.push("2nd choice");
        data.push("3rd choice");
        data.push("4th choice");
        data.push("5th choice");
        data.push("6th choice");
    }
    ////////////////////////////////////////////////////////
    var theDropDown = d3.select("#dropdown_container")
    .append("select")
    .attr("class", "selection")
    .attr("name", "country-list");

    var choice = theDropDown.selectAll("option")
        .data(data).enter()
        .append("option");
    choice.text(function(d) {return d;})
        .attr("value", function(d){return d;})
}