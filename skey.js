/*
  CS255 - Winter 2014
  Assignment 1: S/KEY Authentication
  Starter Code Version: 1.0

  SUNet ID #1:
  SUNet ID #2:

  Step 1: Find a project partner and add your SUNet IDs above.
  Step 2: Implement `initialize`, `advance`, `save`, and `load` in `pebble_chain`.
  Step 3: Answer the questions below.
  Step 4: See Piazza for submission instructions.
*/

/* 1. Briefly describe your implementation and its design choices.
 * (e.g. What algorithm did you use? How did you structure your code?
 * Did you do something interesting in \texttt{save}/\texttt{load}?
 * If it's not obvious, justify the space/time used by your implementation.)
// TODO: Answer here (a few sentences).
*/

/* 2. If you were designing an authentication mechanism for a hot new startup
 * that wants to protect its users,
 * how would you decide whether/where to use S/KEY?
// TODO: Answer here (a few sentences).
*/

/* 3. (Will not affect your grade:) How long did you spend on this project?
// TODO: Answer here (just a number).
*/

/* 4. (Optional:) Do you have any comments or
 * suggestions for improving the assignment?
// TODO: Answer here (optional).
*/


/********* External Imports and Convenience Functions ********/


"use strict"; // Makes it easier to catch errors.

var sjcl = require("./lib/sjcl");
var hash = sjcl.hash.sha256.hash; // Hashes a string or bitArray to a bitArray.
var is_equal = sjcl.bitArray.equal; // Compares two bitArrays.
var hex = sjcl.codec.hex.fromBits; // Converts a bitArray to a hex string.

var pow2 = Math.pow.bind(this, 2); // Calculates 2 to a given power.
var log2 = function(x) {return Math.log(x) / Math.log(2);} // Calculates log base 2.


/******** Naive Hash Chain Implementation ********/


function naive_chain() {

  var chain = {
    state: null
  };

  chain.initialize = function(num_iterations, seed) {
    chain.state = {
      pos: 0,
      num_iterations: num_iterations,
      start: hash(seed)
    }

    var initial = chain.state.start;
    for (var i = 0; i < chain.state.num_iterations; i++) {
      initial = hash(initial);
    }

    return initial;
  }

  chain.advance = function() {
    if (chain.state.pos + 1 > chain.state.num_iterations) {
      return null;
    }

    var value = chain.state.start;
    for (var i = 1; i < chain.state.num_iterations - chain.state.pos; i++) {
      value = hash(value);
    }
    chain.state.pos += 1;
    return value;
  }

  // Returns a string.
  chain.save = function() {
    return JSON.stringify(chain.state);
  }

  // Loads a string.
  chain.load = function(str_data) {
    chain.state = JSON.parse(str_data);
  }

  return chain;
}


/******** Pebble-Based Hash Chain Implementation (Jakobsson's algorithm) ********/


function pebble_chain() {

  var chain = {
    state: null
  };

  chain.initialize = function(num_iterations, seed) {
    chain.state = {
      current: 0,
      num_iterations: num_iterations,
      log_num_iterations: log2(num_iterations),
      p: []
    }

    var i;
    var k;
    var value;
    // TODO: Need to optimize the following code
    for (i = 0; i < chain.state.log_num_iterations; ++i) {
      value = seed;
      for (k = 0; k < num_iterations - pow2(i + 1) + 1; ++k)
        value = hash(value);

      chain.state.p.push({
        start_inc: 3 * pow2(i+1),
        dest_inc: 2 * pow2(i+1),
        pos: pow2(i+1),
        dest: pow2(i+1),
        value: value
      });
    }

    var initial = seed;
    for (i = 0; i < num_iterations + 1; ++i)
      initial = hash(initial);

    return initial;
  }

  chain.advance = function() {
    // Implement Fractal hash sequence of Jakobsson
    var state = chain.state;
    if (state.current == state.num_iterations)
      return null;

    state.current += 1;
    for (var i = 0; i < state.log_num_iterations; ++i) {
      if (state.p[i].pos != state.p[i].dest) {
        state.p[i].pos -= 2;
        state.p[i].value = hash(hash(state.p[i].value));
      }
    }

    var value;
    if (state.current % 2 == 1) {
      value = hash(state.p[0].value);
    } else {
      value = state.p[0].value;
      state.p[0].pos += state.p[0].start_inc;
      state.p[0].dest += state.p[0].dest_inc;
      if (state.p[0].dest > state.num_iterations) {
        state.p[0].dest = Number.POSITIVE_INFINITY;
        state.p[0].pos = Number.POSITIVE_INFINITY;
      } else {
        for (var i = 1; i < state.log_num_iterations; ++i)
          if (state.p[i].pos == state.p[0].pos) {
            state.p[0].value = state.p[i].value;
            break;
          }
      }

      state.p.sort(function (p1, p2) {
        return p1.dest - p2.dest;
      });
    }

    return value;
  }

  // Returns a string.
  chain.save = function() {
    return JSON.stringify(chain.state);
  }

  // Loads a string.
  chain.load = function(str_data) {
    chain.state = JSON.parse(str_data);
  }

  return chain;
}

/********* Export functions for testing. ********/


module.exports.naive_chain = naive_chain;
module.exports.pebble_chain = pebble_chain;


/********* End of Original File ********/

