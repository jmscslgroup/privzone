import React, { Component } from "react";
import MapPage from "./MapPage";
import { BrowserRouter as Router, Switch, Route, Link, Redirect } from "react-router-dom";
import { Button, Grid, Typography } from "@material-ui/core";

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
