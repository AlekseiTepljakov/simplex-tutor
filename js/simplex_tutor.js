// --------------------------
//   Simplex Tutor JS v 1.0
// --------------------------

// Strings to be used in the tutor
var STRING_INDEX = {
    "pre_initial": "The following tool uses the Simplex method to solve the problems of type $$\\begin{array}{ccl}z & = & CX\\to\\max(\\min)\\\\AX & \\leqslant & B\\\\X & \\geqslant & 0.\\end{array}$$" +
                   "Please set up your problem in terms of an initial tableau below. You may use common fractions, such as $-1/2$. Note, that any decimal fraction will " +
                   "be automatically converted to a common fraction. Slack variables are added automatically. Refresh page to start over.",
    "proceed_to_initial": "Once you are ready, click on <<<button_proceed>>> to continue.",
    "initial": "Done! To navigate forward to the next iteration, click on the following key or press it on your keyboard. <<<button_next>>>",
    "inspect_obj_row_continue": "Inspect the objective row. The most negative element is <<<negative_element>>>. <<<button_next>>>",
    "inspect_obj_row_stop": "Inspect the objective row. There are no negative values, so a feasible solution has been found. <<<button_next>>>",
    "degeneracy": "One or more basic variables have zero values, so the solution is degenerate.",
    "locate_pivot_element": "To locate the pivot element in the column, let us compute the ratios of ($b$ : column elements). " +
                            "We get <<<ratios_computed>>>. The smallest positive ratio <<<smallest_ratio>>> is obtained in the " +
                            "row <<<row>>>, so the pivot element is <<<pivot_element>>>. <<<button_next>>>",
    "process_pivot_element": "To replace the pivot element with $+1$, we need to divide row <<<row>>> by <<<row_divide>>>. " +
                             "Then, the new row elements are <<<new_row_elements>>>. <<<button_next>>>",
    "process_pivot_column": "To get $0$ elsewhere in the pivot column, apply the following row operations using the modified " +
                            "row <<<row>>> to get the new tableau: <<<row_operations>>>. <<<button_next>>>",
    "new_tableau": "The new tableau is thus constructed."
};

// Helper functions
function mathjax_cells_update(){
    // Queue a MathJax update
    MathJax.Hub.Queue(["Typeset",MathJax.Hub,"cells"]);
}


// Simplex Table object --- contains the table, rendering options with callbacks,
// corresponding update methods, and everything else needed to work with the table
function SimplexTable(){

    this.rows = new Array(); // All rows are stored in a multidimensional array of Fractions

    this.unknowns = null; // Number of unknowns
    this.ineqs = null;    // Number of inequalities
    this.table_no = null; // Tableau number

    // Initial class is used to locate the initial (first) table later
    this.initial_class = null;

    // Initialize the values
    this.init();

}

SimplexTable.prototype.init = function(){

    // Shorthand call
    var $f = Fraction;

    // Default row values
    this.rows = [[$f(1), $f(1), $f(1), $f(0), $f(0), $f(1)],
                 [$f(1), $f(1), $f(0), $f(1), $f(0), $f(1)],
                 [$f(-1), $f(-2), $f(0), $f(0), $f(1), $f(0)]
    ];

    this.unknowns = 2;
    this.ineqs = 2;    // This is also the number of slack variables
    this.table_no = 1;

};

SimplexTable.prototype.addUnknown = function()
{
    // Update the current values
    this.update_values();

    var $f = Fraction;
    // Add an unknown to every row
    for (var k=0; k<this.rows.length; k++){
        var new_var = $f(1);
        if (k===this.rows.length-1){
            new_var = $f(-this.unknowns-1);
        }
        this.rows[k].splice(this.unknowns, 0, new_var);
    }
    this.unknowns++;

    // Update the initial table
    this.update_initial();

};

SimplexTable.prototype.removeUnknown = function()
{
    // Only remove an unknown, if there are more than one

    if (this.unknowns > 1){
        // Update the current values
        this.update_values();
        this.unknowns--;

        // Remove an unknown from every row
        for (var k=0; k<this.rows.length; k++){
            console.log(this.rows[k].splice(this.unknowns, 1));
        }

        this.update_initial();
    }



};

SimplexTable.prototype.addConstraint = function(){

    var $f = Fraction;

    this.update_values();

    // New inequality
    this.ineqs++;

    // First, construct the new row
    var new_row = [];

    // For the unknowns
    for (var k=0; k<this.unknowns; k++){
        new_row.push($f(1));
    }

    // For slack variables
    for (var k=0; k<this.ineqs-1; k++){
        new_row.push($f(0));
    }

    // Last slack variable is equal to 1,
    // objective is equal to 0, and RHS is 1
    new_row.push($f(1));
    new_row.push($f(0));
    new_row.push($f(1));

    // Now, update all rows of the existing matrix
    for (var k=0; k<this.rows.length; k++){
        this.rows[k].splice(this.rows[k].length-2, 0, $f(0));
    }

    // Now, add the new row
    this.rows.splice(this.rows.length-1, 0, new_row);

    // Update the matrix
    this.update_initial();

};

SimplexTable.prototype.removeConstraint = function(){

    // The offset from the end of the matrix is always known

    // Only allow removal if there are more than one constraint
    if (this.ineqs > 1){

        this.update_values();

        // First remove the last slack column
        for (k=0; k<this.rows.length; k++){
            this.rows[k].splice(this.rows[k].length-2, 1);
        }

        // Then, remove the constraint row
        this.rows.splice(this.rows.length-1, 1);

        this.ineqs--;

        this.update_initial();
    }

};

// Render the table in the container specified by c(lass)
SimplexTable.prototype.render = function(c){

    // Get the table container and save it for later use
    var tc = d3.select("." + c);

    // Now, generate the table rows/columns
    var t = tc.append("table").classed("simplex-tableau", true);

    // Render table header
    var th = t.append("tr");

    for (var k=0; k<(this.rows[0].length + 1); k++){

        // Generate proper name
        var myn = "";
        if (k===0){
            myn = "Row";
        }else if (k>0 && k<=this.unknowns){
            myn = "$x_{" + k + "}$";
        }else if (k>this.unknowns && k<=this.unknowns+this.ineqs)
        {
            myn = "$s_{" + (k-this.unknowns) + "}$";
        }else if (k === this.unknowns+this.ineqs+1){
            myn = "$z$";
        }else if (k === this.unknowns+this.ineqs+2){
            myn = "$b$";
        }

        th.append("th")
            .classed("r-0 c-"+k, true)
            .html(myn);
    }

    // Now, render all the rows, placing text boxes as needed
    for (var k=0; k<this.rows.length; k++){
        var r = this.rows[k];
        var tr = t.append("tr");
        for (var m=0; m<r.length+1; m++){

            // Choose text to render
            var myt = "";
            if (m===0){
                myt = "$R_{" + (k+1) + "}$";
            }else{
                myt = "$" + this.rows[k][m-1].toLatex() + "$";
            }
            tr.append("td")
                .classed("r-" + (k+1) +  " c-" + m, true)
                .html(myt);

        }
    }

    mathjax_cells_update();

};

// Render the initial table in the container specified by c(lass)
// The difference is that textboxes are inserted
SimplexTable.prototype.render_initial = function(c){

    // Get the table container and save it for later use
    var tc = d3.select("." + c);
    this.initial_class = c;

    // Now, generate the table rows/columns
    var t = tc.append("table").classed("simplex-tableau", true);

    // Render table header
    var th = t.append("tr");

    for (var k=0; k<(this.rows[0].length + 1); k++){

        // Generate proper name
        var myn = "";
        if (k===0){
            myn = "Row";
        }else if (k>0 && k<=this.unknowns){
            myn = "$x_{" + k + "}$";
        }else if (k>this.unknowns && k<=this.unknowns+this.ineqs)
        {
            myn = "$s_{" + (k-this.unknowns) + "}$";
        }else if (k === this.unknowns+this.ineqs+1){
            myn = "$z$";
        }else if (k === this.unknowns+this.ineqs+2){
            myn = "$b$";
        }

        th.append("th")
            .classed("r-0 c-"+k, true)
            .html(myn);
    }

    // Now, render all the rows, placing text boxes as needed
    for (var k=0; k<this.rows.length; k++){
        var r = this.rows[k];
        var tr = t.append("tr");
        for (var m=0; m<r.length+1; m++){

            // Choose text to render
            var myt = "";
            if (m===0){
                myt = "$R_{" + (k+1) + "}$";
            }else if(m>0 && m<=this.unknowns){
                myt = "<input type='text' class='entry r-" + (k+1) + " c-" + m + "' value='" + this.rows[k][m-1].toFraction() + "' />";
            }else if(m === r.length){
                myt = "<input type='text' class='entry r-" + (k+1) + " c-" + m + "' value='" + this.rows[k][m-1].toFraction() + "' />";
            }
            else{
                myt = "$" + this.rows[k][m-1].toLatex() + "$";
            }
            tr.append("td")
                .classed("r-" + (k+1) +  " c-" + m, true)
                .html(myt);

        }
    }

    var self = this;

    var tcc = tc.append("div").classed("controls", true);

    // Add controls
    tcc.append("span").html("Add unknown").classed("simple-button", true).on("click", function(){
        self.addUnknown();
    })

    tcc.append("span").html("Remove unknown").classed("simple-button", true).on("click", function(){
        self.removeUnknown();
    })

    tcc.append("span").html("Add constraint").classed("simple-button", true).on("click", function(){
        self.addConstraint();
    })

    tcc.append("span").html("Remove constraint").classed("simple-button", true).on("click", function(){
        self.removeConstraint();
    })

    mathjax_cells_update();
};

// Updates initial table, if argument is "false" then the add/remove
// rows/columns feature and the text boxes are not rendered
SimplexTable.prototype.update_initial = function(f){

    if (f === undefined){
        f = true;
    }

    // Remove the initial table
    d3.select("." + this.initial_class).html("");

    if (!f){

        // Update the values
        this.update_values();

        // Replace table with a fixed one
        this.render(this.initial_class);
    }
    else{
        // Just update the table taking into account the updated values
        this.render_initial(this.initial_class);
    }

};

SimplexTable.prototype.update_values = function(){

    var self = this;

    d3.selectAll('.' + this.initial_class + ' input.entry')
        .each(function(d){

            var my_val = d3.select(this).property('value');

            var the_class = d3.select(this).attr('class');

            // Get indices of rows and columns
            var myregexp_r = /r-([0-9]+)/i;
            var match = myregexp_r.exec(the_class);
            var r_no = null;
            if (match != null) {
                r_no = parseInt(match[1]);
            }

            var myregexp_c = /c-([0-9]+)/i;
            var match = myregexp_c.exec(the_class);
            var c_no = null;
            if (match != null) {
                c_no = parseInt(match[1]);
            }

            // Update the cell
            if (c_no !== null && r_no !== null){
                self.rows[r_no-1][c_no-1] = Fraction(my_val);
            }

        });
};



// Cell player appends the text to the cells and creates the tables as the tutor progresses
function CellPlayer(id){

    var self = this;

    this.mc = d3.select("#"+id);

    // Cell number to attach unique classes
    this.text_cell_no = 1;
    this.table_cell_no = 1;
    this.current_text_no = 1; // Changes on any new text added
    this.current_table_no = 1; // Changes only when we replace the table at the end of an iteration

    this.state = 0; // 0 is the initial state and it never returns to this number

    // The table that we are working on
    this.table = new SimplexTable();

    // Welcome message
    this.addCellMessage(STRING_INDEX["pre_initial"]);

    // Create the initial table with certain controls to set up the problem
    this.addTableCell();
    this.table.render_initial("table-cell-"+this.current_table_no);

    // Proceed message
    this.addCellMessage(this.replaceStartButton(STRING_INDEX["proceed_to_initial"]));

    // Start button callback
    d3.select(".button-start").on("click", function() {

        // Fix the values of the initial table
        self.table.update_initial(false);

        // Remove the "proceed" message
        self.removeCurrentCellMessage();

        // Start the iterations
        self.iterate();

    });
}

CellPlayer.prototype.iterate = function()
{
    // Read off state and choose where to go
    switch(this.state){
        case 0:
            this.addCellMessage(STRING_INDEX["initial"]);
            this.state = 1; // Specify next state
            break;

        case 1:
            alert("There is nothing here yet.");
            break;

    }
};

// Helper functions for replacing content

// Next button
CellPlayer.prototype.replaceNextButton = function(text){
    return text.replace("<<<button_next>>>", " <span class='button-next simple-button'>N</span> ");
};

// Start button
CellPlayer.prototype.replaceStartButton = function(text){
    return text.replace("<<<button_proceed>>>", " <span class='button-start simple-button'>proceed</span> ");
};

CellPlayer.prototype.addCellMessage = function(text){

    this.current_text_no = this.text_cell_no;
    this.mc.append("p").classed("text-cell-" + this.text_cell_no++, true).html(this.replaceNextButton(text));

    // Bind an event to the N button
    var self = this;
    d3.select(".button-next").on("click", function(){
       d3.select(this).remove();
       self.iterate();
    });

    // Bind a keyboard event as well
    Mousetrap.bind("n", function(e){
        d3.select(".button-next").remove();
        self.iterate();
    });

};

CellPlayer.prototype.removeCurrentCellMessage = function(){
    this.mc.select(".text-cell-" + this.current_text_no).remove();
}

CellPlayer.prototype.addTableCell = function(){
    this.current_table_no = this.table_cell_no;
    this.mc.append("div").classed("table-cell-" + this.table_cell_no++, true);
};