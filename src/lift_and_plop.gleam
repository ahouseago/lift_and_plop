import gleam/dynamic/decode
import gleam/float
import gleam/option.{type Option, None, Some}
import gleam/result
import lustre
import lustre/attribute.{attribute, class}
import lustre/effect
import lustre/element.{text}
import lustre/element/html.{div}
import lustre/event
import plinth/browser/document

pub fn main() {
  let app = lustre.application(init, update, view)
  let assert Ok(_) = lustre.start(app, "#app", Nil)

  Nil
}

fn listen_for_pointer_up() {
  use dispatch <- effect.from
  document.add_event_listener("pointerup", fn(_event) { dispatch(PointerUp) })
}

@external(javascript, "./lift_and_plop.ffi.mjs", "listen_for_pointer_move")
fn do_listen_for_pointer_move(_handler: fn(decode.Dynamic) -> Nil) -> Nil {
  Nil
}

fn listen_for_pointer_move(
  handler: fn(decode.Dynamic) -> msg,
) -> effect.Effect(msg) {
  use dispatch <- effect.from
  use dyn <- do_listen_for_pointer_move

  dyn |> handler |> dispatch
}

fn handle_pointer_move(e: decode.Dynamic) {
  let decoded =
    decode.run(e, {
      use client_x <- decode.field("clientX", decode.float)
      use client_y <- decode.field("clientY", decode.float)

      decode.success(PointerMove(client_x, client_y))
    })
  decoded
  |> result.unwrap(PointerUp)
}

pub type TargetBox {
  Box(
    x: Float,
    y: Float,
    width: Float,
    height: Float,
    offset_x: Float,
    offset_y: Float,
  )
}

pub type PointerPosition {
  PointerPosition(x: Float, y: Float)
}

pub type Model {
  Model(clicked: Option(TargetBox))
}

fn init(_flags) {
  #(
    Model(None),
    effect.batch([
      listen_for_pointer_up(),
      listen_for_pointer_move(handle_pointer_move),
    ]),
  )
}

type Msg {
  PointerDown(target: TargetBox)
  PointerMove(x: Float, y: Float)
  PointerUp
}

fn update(model, msg: Msg) {
  case model, msg {
    Model(None), PointerDown(target) -> {
      #(Model(Some(target)), effect.none())
    }
    Model(Some(target_box)), PointerMove(x, y) -> {
      #(Model(Some(Box(..target_box, x:, y:))), effect.none())
    }
    Model(Some(..)), PointerUp -> {
      #(Model(None), effect.none())
    }
    _, _ -> #(model, effect.none())
  }
}

fn view(model: Model) {
  div([], [
    draggable([text("Drag me!")], PointerDown),
    draggable(
      [
        text(
          "Loreum ipsum dolor sit aasdjfka jafsj kej kaod jskaf dadsfo andcie amk jaou cmka j that went fo tfha keicm a",
        ),
      ],
      PointerDown,
    ),
    draggable([text("Drag me!")], PointerDown),
    draggable([text("Drag me!")], PointerDown),
    case model.clicked {
      None -> element.none()
      Some(box) -> drag_box(box, PointerMove)
    },
  ])
}

fn draggable(
  children,
  on_pointer_down handle_pointer_down: fn(TargetBox) -> msg,
) {
  let on_pointer_down =
    event.on("pointerdown", {
      use client_x <- decode.field("clientX", decode.float)
      use client_y <- decode.field("clientY", decode.float)
      use offset_x <- decode.field("offsetX", decode.float)
      use offset_y <- decode.field("offsetY", decode.float)
      use width <- decode.then(decode.at(
        ["currentTarget", "clientWidth"],
        decode.float,
      ))
      use height <- decode.then(decode.at(
        ["currentTarget", "clientHeight"],
        decode.float,
      ))

      decode.success(
        handle_pointer_down(Box(
          x: client_x,
          y: client_y,
          width:,
          height:,
          offset_x:,
          offset_y:,
        )),
      )
    })
    |> event.prevent_default
  div([class("draggable"), on_pointer_down], children)
}

fn drag_box(
  box: TargetBox,
  on_pointer_move handle_pointer_move: fn(Float, Float) -> msg,
) {
  let on_pointer_move =
    event.on("pointermove", {
      use client_x <- decode.field("clientX", decode.float)
      use client_y <- decode.field("clientY", decode.float)

      decode.success(handle_pointer_move(client_x, client_y))
    })
    |> event.throttle(50)

  let x = box.x -. box.offset_x
  let y = box.y -. box.offset_y
  let width = box.width
  let height = box.height

  div(
    [
      on_pointer_move,
      class("pointer-box"),
      attribute.style("left", float.to_string(x) <> "px"),
      attribute.style("top", float.to_string(y) <> "px"),
      attribute.style("width", float.to_string(width) <> "px"),
      attribute.style("height", float.to_string(height) <> "px"),
    ],
    [],
  )
}
