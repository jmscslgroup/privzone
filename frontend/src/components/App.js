import React, { Component } from "react";
import { render } from "react-dom";
import HomePage from "./HomePage";
import "bootstrap/dist/css/bootstrap.min.css";
//import Navbar from "./../Navigation/Navbar.js";

export default class App extends Component {
    constructor(props) {
        super(props);
    }

    render() {
        return <HomePage />;
    }
//    render() {
//        return <Navbar />;
//    }
}

const appDiv = document.getElementById("app");
render(<App />, appDiv);
