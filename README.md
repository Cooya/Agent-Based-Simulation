# Agent-Based-Simulation

## Installation 

* Install NodeJS (https://nodejs.org/en/)
* run command "npm install" into the app folder for install dependencies
* run command "npm start" for run the server on the port 80


## Local Simulation

* Go on localhost with your web browser
* Input file : the xlsx file (or json) that contains data
* Range in the sheet : represents the set of cells to read (you have to include the header)
* Number of iterations : number of times of the map function is called on each entry
* Input variables : local variables used by the map or the reduce function but not included in the output
* Map function : function executed on each entry
* Output variables : global variables used by the reducer and displayed at the end
* Reduce function : function executed once on each entry after mapping for filling output variables
* Output : json structure containing output values and runtime duration

The simulation can take a few seconds according to the number of iterations and the range size.

## Online Simulation

* Go on http://nicodev.fr/sim if you do not want to install or download anything
