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
                    <Route exact path='/'>
                        <Grid container spacing={0} align="center" justify="center" direction="column" alignItems="center">
                            <Grid id="top-row" container spacing={1}>
                                <Grid item xs={4}>
                                    <Typography component="h4" variant="h4">Privzone</Typography>
                                </Grid>
                            </Grid>
                            <Grid id="bottom-row" container spacing={1}>
                                <Grid item xs={2}>
                                    <Button variant="contained" color="primary" to="/" component={Link}>Home</Button>
                                </Grid>
                                <Grid item xs={2}>
                                    <Button variant="contained" color="secondary" to="/map" component={Link}>Map</Button>
                                </Grid>
                            </Grid>
                        </Grid>
                    </Route>
                    <Route path='/map' component={MapPage} />
                </Switch>
            </Router>
        )
    }
}
