import React from 'react';
import PropTypes from 'prop-types';
import * as PIXI from 'pixi.js';
import {radToDeg} from "./utils";

// The coordinates for the center of the canvas
// REMINDER: (0,0) is at the top left corner and
// the positive Y direction is DOWN, not UP.
const ORBIT_CENTER_X = 600;
const ORBIT_CENTER_Y = 460;

const getPlanetPos = function(radius, phase) {
    return new PIXI.Point(
        radius * Math.cos(-phase) + ORBIT_CENTER_X,
        radius * Math.sin(-phase) + ORBIT_CENTER_Y
    );
};

export default class MainView extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            isHoveringOnSun: false,
            isHoveringOnObserverPlanet: false,
            isHoveringOnTargetPlanet: false,
            isHoveringOnConstellation: false
        };

        this.resources = {};

        this.orbitCenter = new PIXI.Point(ORBIT_CENTER_X, ORBIT_CENTER_Y);

        this.start = this.start.bind(this);
        this.stop = this.stop.bind(this);
        this.animate = this.animate.bind(this);

        this.onDragStart = this.onDragStart.bind(this);
        this.onDragEnd = this.onDragEnd.bind(this);

        this.onObserverPlanetMove = this.onObserverPlanetMove.bind(this);
        this.onTargetPlanetMove = this.onTargetPlanetMove.bind(this);
    }

    render() {
        return (
            <div className="MainView"
                 ref={(thisDiv) => {this.el = thisDiv;}} />
        );
    }

    componentDidMount() {
        this.app = new PIXI.Application({
            // Size of canvas
            width: ORBIT_CENTER_X * 2,
            height: ORBIT_CENTER_Y * 2,
            backgroundColor: 0x241b23,

            antialias: true,
            resolution: Math.min(window.devicePixelRatio, 3) || 1,
        });

        this.el.appendChild(this.app.view);

        // Loads all the images
        this.app.loader
            .add('sun', 'img/sun-circle.png')
            .add('observerPlanet', 'img/blue-circle.png')
            .add('targetPlanet', 'img/grey-circle.png')
            .add('highlight', 'img/circle-highlight.svg');

        const me = this;
        this.app.loader.load((loader, resources) => {
            me.resources = resources;

            me.sun = me.drawSun(resources.sun);
            me.arrowToSun = me.drawArrows();
            me.arrowToTarget = me.drawArrows();

            me.elongationArc = me.drawArc();

            me.targetPlanetOrbitContainer = me.drawTargetPlanetOrbit();
            me.observerPlanetOrbitContainer = me.drawObserverPlanetOrbit();

            me.observerPlanetContainer = me.drawObserverPlanet(
                resources.observerPlanet, resources.highlight
            );

            me.targetPlanetContainer = me.drawTargetPlanet(
                resources.targetPlanet, resources.highlight);

            me.observerPlanetName = me.drawText (this.props.observerName, me.props.radiusObserverPlanet, false);
            me.targetPlanetName = me.drawText (this.props.targetName, me.props.radiusTargetPlanet, true);

            me.start();
        });
    }

    componentWillUnmount() {
        this.app.stop();
    }

    start() {
        if (!this.frameId) {
            this.frameId = requestAnimationFrame(this.animate);
        }
    }

    stop() {
        cancelAnimationFrame(this.frameId);
    }

    animate() {
        this.updateObserverPlanetOrbit();
        this.updateTargetPlanetOrbit();

        this.updateText();

        this.observerPlanetContainer.position = getPlanetPos(
            this.props.radiusObserverPlanet,
            this.props.observerPlanetAngle
        );

        this.targetPlanetContainer.position = getPlanetPos(
            this.props.radiusTargetPlanet,
            this.props.targetPlanetAngle
        );

        this.updateArrows();
        this.updateArc();
        this.updateShade(this.observerPlanetShade, this.props.observerPlanetAngle);
        this.updateShade(this.targetPlanetShade, this.props.targetPlanetAngle);

        if (this.state.isHoveringOnObserverPlanet || this.draggingObserverPlanet) {
            this.observerPlanetHighlight.visible = true;
        } else {
            this.observerPlanetHighlight.visible = false;
        }

        if (this.state.isHoveringOnTargetPlanet || this.draggingTargetPlanet) {
            this.targetPlanetHighlight.visible = true;
        } else {
            this.targetPlanetHighlight.visible = false;
        }

        this.frameId = requestAnimationFrame(this.animate);
    }

    updateShade(shade, angle) {
        let startAngle = -Math.PI / 2;
        let endAngle = Math.PI / 2;

        startAngle -= angle;
        endAngle -= angle;

        shade.clear();
        shade.beginFill(0x000000);
        shade.alpha = 0.7;
        shade.arc(
            0,
            0,
            20.5,
            startAngle,
            endAngle);
    }

    drawText(name, bodyRadius, target) {
        const text = new PIXI.Text(name, {
            fontFamily: 'Garamond',
            fontSize: 42,
            fill: 0x99c9ac,
            align: 'center'
        });

        let radius = bodyRadius + 15;

        if (target) {
            radius = bodyRadius * -1;
            radius -= 60;
        }

        text.resolution = 2;
        text.position.x = ORBIT_CENTER_X - (text.width / 2);
        text.position.y = ORBIT_CENTER_Y + radius;
        this.app.stage.addChild(text);

        return text;
    }

    updateText() {
        // If the user deselects the box for labelling
        // the orbits, then just display nothing
        if (!this.props.labelOrbits) {
            this.observerPlanetName.text = "";
            this.targetPlanetName.text = "";
            return;
        }

        // If we're in zoomed out state, the size of the
        // text needs to be smaller
        if (this.props.zoomOut) {
            this.observerPlanetName.style.fontSize = 30;
            this.targetPlanetName.style.fontSize = 30;
        } else {
            this.observerPlanetName.style.fontSize = 42;
            this.targetPlanetName.style.fontSize = 42;
        }

        // Set the name of the planet to what the user selected
        // From the drop down menu (defaults to 'observer' or 'target')
        this.observerPlanetName.text = this.props.observerName;
        this.targetPlanetName.text = this.props.targetName;

        // Positions of the text changes based on orbit radius
        let observerNameY = this.props.radiusObserverPlanet + 8;
        let targetNameY = this.props.radiusTargetPlanet * -1 - 60;

        let observerNameX = this.observerPlanetName.width / 2;
        let targetNameX = this.targetPlanetName.width / 2;

        this.observerPlanetName.x = ORBIT_CENTER_X - observerNameX;
        this.targetPlanetName.x = ORBIT_CENTER_X - targetNameX;

        this.observerPlanetName.y = ORBIT_CENTER_Y + observerNameY;
        this.targetPlanetName.y = ORBIT_CENTER_Y + targetNameY;
    }

    drawArc() {
        const elongationArc = new PIXI.Graphics();
        elongationArc.visible = true;

        elongationArc.clear();
        elongationArc.lineStyle(2, 0xe8c3c3);
        elongationArc.arc(
            ORBIT_CENTER_X,
            ORBIT_CENTER_Y,
            45,
            this.props.targetAngle,
            this.props.sunAngle,
            true
        );

        this.app.stage.addChild(elongationArc);
        return elongationArc;
    }

    updateArc() {
        this.elongationArc.clear();
        // If the user deselects the box for showing
        // elongation arc, then simply return
        if (!this.props.showElongation) {
            return;
        }

        let focusedBody = this.targetPlanetContainer;
        this.elongationArc.lineStyle(3.5, 0xa64e4e);
        this.elongationArc.moveTo(focusedBody.x, focusedBody.y);
        let east = this.greaterThan180();
        this.elongationArc.arc(
            focusedBody.x,
            focusedBody.y,
            80,
            -this.props.obsAngleTarget,
            -this.props.sunAngleTarget,
            east
        );

        this.updateArcArrow(east);
    }

    updateArcArrow(east) {
        if (east) {
            this.halfArrow(-0.09, -10.2, 149);
            this.halfArrow(-0.09, 10.2, 172);
        } else {
            this.halfArrow(0.085, 10.2, 149);
            this.halfArrow(0.085, -10.2, 172);
        }
    }

    halfArrow(angleShift, angleReverse, rad) {
        this.elongationArc.lineStyle(3.5, 0xa64e4e);
        let smt = getPlanetPos(
            this.props.radiusTargetPlanet,
            this.props.targetPlanetAngle
        );

        let startX = smt.x;
        let startY = smt.y;

        let receive = this.closerY(angleShift, rad);
        let endX = receive.x;
        let endY = receive.y;

        let centrePointX = ((startX + endX) / 2.0);
        let centrePointY = ((startY + endY) / 2.0);

        let angle = Math.atan2(endY - startY, endX - startX) + angleReverse;
        let dist = 10;

        this.elongationArc.moveTo((Math.sin(angle) * dist + centrePointX), (-Math.cos(angle) * dist + centrePointY));
        this.elongationArc.lineTo((-Math.sin(angle) * dist + centrePointX), (Math.cos(angle) * dist + centrePointY));
    }

    closerY(angleShift, rad) {
        let smt = getPlanetPos(
            this.props.radiusObserverPlanet,
            this.props.observerPlanetAngle
        );

        let focusedBody = this.targetPlanetContainer;
        let angle = Math.atan2(smt.y - focusedBody.y, smt.x - focusedBody.x) + angleShift;

        let radius = rad;
        let y = radius * Math.sin(angle);
        let x = radius * Math.cos(angle);

        return new PIXI.Point(focusedBody.x + x, focusedBody.y + y);
    }

    greaterThan180() {
        let sunAng = this.props.sunAngleTarget;
        let targetAng = this.props.obsAngleTarget;

        if (-Math.PI < this.props.sunAngleTarget && this.props.sunAngleTarget < 0) {
            sunAng += 2 * Math.PI;
        }

        if (-Math.PI < this.props.obsAngleTarget && this.props.obsAngleTarget < 0) {
            targetAng += 2 * Math.PI;
        }

        let differenceInAngles = targetAng - sunAng;

        if (differenceInAngles < 0) {
            differenceInAngles += 2 * Math.PI;
        }

        let num = Math.round(differenceInAngles * 180 / Math.PI * 10) / 10;

        if (num > 180) {
            return true;
        }

        return false;
    }

    drawArrows() {
        const g = new PIXI.Graphics();
        g.visible = false;

        g.clear();
        g.lineStyle(4.0, 0xedb7b7);

        this.app.stage.addChild(g);
        return g;
    }

    updateArrows() {
        let arrowRadius = 450;
        // let arrowRadius = 500;
        let zoomArrowRad = 50;

        this.arrowToSun.clear();
        this.arrowToTarget.clear();

        if (!this.props.showElongation) {
            return;
        }

        this.arrowToTarget.moveTo(
            this.targetPlanetContainer.x,
            this.targetPlanetContainer.y
        );

        this.arrowToSun.moveTo(
            this.targetPlanetContainer.x,
            this.targetPlanetContainer.y
        );


        this.arrowToTarget.visible = true;
        this.arrowToTarget.lineStyle(3.5, 0xa64e4e);

        this.arrowToSun.visible = true;
        this.arrowToSun.lineStyle(3.5, 0xa64e4e);

        let throughTarget = this.getThroughTarget(arrowRadius, zoomArrowRad);

        this.arrowToTarget.lineTo(throughTarget.x, throughTarget.y);

        let throughSun = this.arrowThroughBody (
            this.sun.x,
            this.sun.y,
            this.targetPlanetContainer.x,
            this.targetPlanetContainer.y,
            arrowRadius
        );

        this.arrowToSun.lineTo(
            throughSun.x,
            throughSun.y
        );

        let angleShift = 30;

        this.drawArrow(this.arrowToTarget, throughTarget, angleShift);
        this.drawArrow(this.arrowToTarget, throughTarget, -angleShift);

        this.drawArrow(this.arrowToSun, throughSun, angleShift);
        this.drawArrow(this.arrowToSun, throughSun, -angleShift);
    }

    drawArrow(line, point, angleShift) {
        let focusedBody = this.targetPlanetContainer;
        line.lineStyle(3.5, 0xa64e4e);
        let tip = new PIXI.Point(point.x - focusedBody.x, focusedBody.y - point.y);

        let angle = Math.atan2(tip.y, tip.x);
        let length = 25;

        let cv = this.convert(angle);

        let shift = cv + angleShift;

        let xDiff = length * Math.cos(this.degToRad(shift));
        let yDiff = length * Math.sin(this.degToRad(shift));

        let halfX = tip.x + xDiff;
        let halfY = tip.y + yDiff;

        halfX = halfX + focusedBody.x;
        halfY = focusedBody.y - halfY;

        line.moveTo(point.x, point.y);
        line.lineTo(halfX, halfY);
    }

    convert(ang) {
        let angle = ang;
        if (angle < 0) {
            let difference = Math.PI + angle;
            angle = Math.PI + difference;
        }

        return ((angle * 180 / Math.PI) + 180) % 360;
    }

    degToRad(ang) {
        return ang * Math.PI / 180;
    }

    getThroughTarget(arrowRadius, zoomedArrowRadius) {
        let radTarget = this.props.radiusObserverPlanet;
        let radObs = this.props.radiusTargetPlanet;

        let Xe = this.targetPlanetContainer.x;
        let Ye = this.targetPlanetContainer.y;

        let Xt = this.observerPlanetContainer.x;
        let Yt = this.observerPlanetContainer.y;

        if (radTarget > radObs) {
            return this.arrowThroughBody (
                Xt,
                Yt,
                Xe,
                Ye,
                zoomedArrowRadius
            );
        }

        Xe = Xe - ORBIT_CENTER_X;
        Ye = ORBIT_CENTER_Y - Ye;
        Xt = Xt - ORBIT_CENTER_X;
        Yt = ORBIT_CENTER_Y - Yt;
        let slope = (Yt - Ye) / (Xt - Xe);
        let b = (Ye - (slope * Xe));
        let results = this.quadraticEquation(
            Math.pow(slope, 2) + 1,
            2 * slope * b,
            Math.pow(b, 2) - Math.pow(arrowRadius, 2)
        );

        let actualX  = results[1];
        if (this.observerPlanetContainer.x > this.targetPlanetContainer.x) {
            actualX = results[0];
        }
        let actualY = slope * actualX + b;
        return new PIXI.Point(ORBIT_CENTER_X + actualX, ORBIT_CENTER_Y - actualY);
    }

    quadraticEquation(a, b, c) {
        let result = (-1 * b + Math.sqrt(Math.pow(b, 2) - (4 * a * c))) / (2 * a);
        let result2 = (-1 * b - Math.sqrt(Math.pow(b, 2) - (4 * a * c))) / (2 * a);
        return [result, result2];
    }

    arrowThroughBody(firstX, firstY, secondX, secondY, scaling) {
        let ang = Math.atan2((firstY - secondY), (firstX - secondX));

        let finalX = scaling * Math.cos(ang) + firstX;
        let finalY = scaling * Math.sin(ang) + firstY;

        return new PIXI.Point(finalX, finalY);
    }

    updateObserverPlanetOrbit() {
        this.observerPlanetOrbitContainer.clear();
        this.observerPlanetOrbitContainer.lineStyle(2, 0xffffff);
        this.observerPlanetOrbitContainer.drawCircle(this.orbitCenter.x, this.orbitCenter.y, this.props.radiusObserverPlanet);
    }

    updateTargetPlanetOrbit() {
        this.targetPlanetOrbitContainer.clear();
        this.targetPlanetOrbitContainer.lineStyle(2, 0xffffff);
        this.targetPlanetOrbitContainer.drawCircle(this.orbitCenter.x, this.orbitCenter.y, this.props.radiusTargetPlanet);
    }

    drawObserverPlanetOrbit() {
        const graphicsObserverPlanet = new PIXI.Graphics();
        graphicsObserverPlanet.lineStyle(2, 0xffffff);
        graphicsObserverPlanet.drawCircle(this.orbitCenter.x, this.orbitCenter.y, this.props.radiusObserverPlanet);

        this.app.stage.addChild(graphicsObserverPlanet);
        return graphicsObserverPlanet;
    }

    drawTargetPlanetOrbit() {
        const graphicsTargetPlanet = new PIXI.Graphics();
        graphicsTargetPlanet.lineStyle(2, 0xffffff);
        graphicsTargetPlanet.drawCircle(this.orbitCenter.x, this.orbitCenter.y, this.props.radiusTargetPlanet);
        this.app.stage.addChild(graphicsTargetPlanet);
        return graphicsTargetPlanet;
    }

    drawObserverPlanet(observerPlanetResource, highlightResource) {
        const observerPlanetContainer = new PIXI.Container();
        observerPlanetContainer.name = 'observerPlanet';
        observerPlanetContainer.buttonMode = true;
        observerPlanetContainer.interactive = true;
        observerPlanetContainer.position = this.orbitCenter;

        const highlight = new PIXI.Sprite(highlightResource.texture);
        highlight.visible = false;
        highlight.width = 30 * 2;
        highlight.height = 30 * 2;
        highlight.anchor.set(0.5);
        this.observerPlanetHighlight = highlight;
        observerPlanetContainer.addChild(highlight);

        const observerPlanet = new PIXI.Sprite(observerPlanetResource.texture);
        observerPlanet.width = 20 * 2;
        observerPlanet.height = 20 * 2;
        observerPlanet.anchor.set(0.5);
        observerPlanetContainer.addChild(observerPlanet);

        const shade = new PIXI.Graphics();
        shade.beginFill(0x000000);
        shade.alpha = 0.7;
        shade.arc(
            0,
            0,
            20,
            -Math.PI / 2,
            Math.PI / 2);
        this.observerPlanetShade = shade;
        observerPlanetContainer.addChild(shade);

        observerPlanetContainer
        // events for drag start
            .on('mousedown', this.onDragStart)
            .on('touchstart', this.onDragStart)
        // events for drag end
            .on('mouseup', this.onDragEnd)
            .on('mouseupoutside', this.onDragEnd)
            .on('touchend', this.onDragEnd)
            .on('touchendoutside', this.onDragEnd)
        // events for drag move
            .on('mousemove', this.onObserverPlanetMove)
            .on('touchmove', this.onObserverPlanetMove);

        this.app.stage.addChild(observerPlanetContainer);
        return observerPlanetContainer;
    }

    drawTargetPlanet(targetPlanetResource, highlightResource) {
        const targetPlanetContainer = new PIXI.Container();
        targetPlanetContainer.name = 'targetPlanet';
        targetPlanetContainer.buttonMode = true;
        targetPlanetContainer.interactive = true;
        targetPlanetContainer.position = this.orbitCenter;

        const highlight = new PIXI.Sprite(highlightResource.texture);
        highlight.visible = false;
        highlight.width = 30 * 2;
        highlight.height = 30 * 2;
        highlight.anchor.set(0.5);
        this.targetPlanetHighlight = highlight;
        targetPlanetContainer.addChild(highlight);

        const targetPlanet = new PIXI.Sprite(targetPlanetResource.texture);
        targetPlanet.width = 20 * 2;
        targetPlanet.height = 20 * 2;
        targetPlanet.anchor.set(0.5);
        targetPlanetContainer.addChild(targetPlanet);

        const shade = new PIXI.Graphics();
        shade.beginFill(0x00FF00);
        shade.alpha = 0.7;
        shade.arc(
            0,
            0,
            20,
            -Math.PI / 2,
            Math.PI / 2);
        this.targetPlanetShade = shade;
        targetPlanetContainer.addChild(shade);

        targetPlanetContainer
        // events for drag start
            .on('mousedown', this.onDragStart)
            .on('touchstart', this.onDragStart)
        // events for drag end
            .on('mouseup', this.onDragEnd)
            .on('mouseupoutside', this.onDragEnd)
            .on('touchend', this.onDragEnd)
            .on('touchendoutside', this.onDragEnd)
        // events for drag move
            .on('mousemove', this.onTargetPlanetMove)
            .on('touchmove', this.onTargetPlanetMove);

        this.app.stage.addChild(targetPlanetContainer);
        return targetPlanetContainer;
    }

    drawSun(sunResource) {
        const sunContainer = new PIXI.Container();
        sunContainer.pivot = this.orbitCenter;
        sunContainer.name = 'sun';
        sunContainer.position = this.orbitCenter;

        const sun = new PIXI.Sprite(sunResource.texture);
        sun.width = 34 * 2;
        sun.height = 34 * 2;
        sun.position = this.orbitCenter;
        sun.anchor.set(0.5);
        sun.rotation = -0.9;
        sunContainer.addChild(sun);

        this.app.stage.addChild(sunContainer);
        return sunContainer;
    }

    onDragStart(event) {
        this.props.stopAnimation();

        this.data = event.data;
        this.dragStartPos = this.data.getLocalPosition(this.app.stage);

        if (event.target.name === 'sun') {
            this.draggingSun = true;
        } else if (event.target.name === 'observerPlanet') {
            this.draggingObserverPlanet = true;

        } else if (event.target.name === 'targetPlanet') {
            this.draggingTargetPlanet = true;
        }
    }

    onDragEnd() {
        this.draggingObserverPlanet = false;
        this.draggingTargetPlanet = false;
        this.data = null;
    }

    onObserverPlanetMove(e) {
        if (e.target && e.target.name === 'observerPlanet' &&
            !this.state.isHoveringOnObserverPlanet
           ) {
            this.setState({isHoveringOnObserverPlanet: true});
        }
        if (!e.target && this.state.isHoveringOnObserverPlanet) {
            this.setState({isHoveringOnObserverPlanet: false});
        }

        if (this.draggingObserverPlanet) {
            const newPosition = this.data.getLocalPosition(this.app.stage);

            // This angle starts at the center of the orbit. It's the
            // difference, in radians, between where the cursor was and
            // where it is now.
            let vAngle =
                -1 * Math.atan2(newPosition.y - this.orbitCenter.y,
                                newPosition.x - this.orbitCenter.x);

            this.props.onObserverPlanetAngleUpdate(vAngle);
        }
    }

    onTargetPlanetMove(e) {
        if (e.target && e.target.name === 'targetPlanet' &&
            !this.state.isHoveringOnTargetPlanet
           ) {
            this.setState({isHoveringOnTargetPlanet: true});
        }
        if (!e.target && this.state.isHoveringOnTargetPlanet) {
            this.setState({isHoveringOnTargetPlanet: false});
        }

        if (this.draggingTargetPlanet) {
            const newPosition = this.data.getLocalPosition(this.app.stage);

            const vAngle =
                  -1 * Math.atan2(newPosition.y - this.orbitCenter.y,
                                  newPosition.x - this.orbitCenter.x);

            this.props.onTargetPlanetAngleUpdate(vAngle);
        }
    }
}

// These are all the parameters that MUST be passed
// Into MainView by main.jsx
MainView.propTypes = {
    observerPlanetAngle: PropTypes.number.isRequired,
    targetPlanetAngle: PropTypes.number.isRequired,
    radiusObserverPlanet: PropTypes.number.isRequired,
    radiusTargetPlanet: PropTypes.number.isRequired,
    targetAngle: PropTypes.number.isRequired,
    sunAngle: PropTypes.number.isRequired,

    showElongation: PropTypes.bool.isRequired,
    labelOrbits: PropTypes.bool.isRequired,
    zoomOut: PropTypes.bool.isRequired,

    observerName: PropTypes.string.isRequired,
    targetName: PropTypes.string.isRequired,

    onObserverPlanetAngleUpdate: PropTypes.func.isRequired,
    onTargetPlanetAngleUpdate: PropTypes.func.isRequired,
    stopAnimation: PropTypes.func.isRequired,
};
