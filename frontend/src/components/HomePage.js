import React, { Component } from "react";
import MapPage from "./MapPage";
import { BrowserRouter as Router, Switch, Route } from "react-router-dom";

export default class HomePage extends Component {
    constructor(props) {
        super(props);
    }

    render() {
        return (
            <Router>
                <Switch>
                    <Route path='/' component={MapPage} />
                </Switch>
            </Router>
        )
    }
}
