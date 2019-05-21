"use strict";

let Promise = require("bluebird");

module.exports = function(generator) {
    let func = Promise.coroutine(generator);
    return function(next) {
        return func.bind(this)(next);
    };
};

/*

   why does this have to exist, you may ask

   mongoose decided that it would try to make javascript type safe...
   what a joke

   so they made it so that when you pass a function to pre("save"),
   the function has to take in at least one argument

   when you create a function with Promise.coroutine, it does not appear
   to have any arguments, since there is no way for the coroutine
   library to know exactly how many arguments your function needs

   the coroutine library uses the arguments object somehow, see
   https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/arguments

   even though your function does end up using the "next" argument passed by mongoose,
   mongoose thinks it is clever and uses the length property of the function you pass
   https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/length

   this will return 0 because the coroutine does not use any arguments explicitly,
   but instead uses the argument object

   so the coroutine has to be wrapped in another function that uses the argument explicitly
   in order to appease mongoose

   the function returned by Promise.coroutine probably looks something like this

   function() { // <- no explicit arguments, length returns 0
       // ...
       stuff.apply(this, arguments); // <- arguments still actually used
       // ...
   }

*/
