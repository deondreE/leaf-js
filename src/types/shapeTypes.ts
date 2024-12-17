import { Color, Vec2 } from "./sceneTypes";

interface Rectangle {
    id: number,
    width: number,
    height: number,
    position: Vec2,
    color: Color,
    children: [],
}   

export { Rectangle }; 