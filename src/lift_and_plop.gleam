import gleam/dynamic/decode
import gleam/int
import gleam/list
import gleam/option.{type Option, None, Some}
import gleam/result
import iv.{type Array}
import lustre
import lustre/attribute.{attribute, class}
import lustre/element.{text}
import lustre/element/html.{div}
import lustre/element/keyed
import lustre/event

pub fn main() {
  let app = lustre.simple(init, update, view)
  let assert Ok(_) = lustre.start(app, "#app", Nil)

  Nil
}

pub type Element {
  Element(id: String, content: String, is_placeholder: Bool)
}

pub type DragState {
  DragState(element_id: String, element_index: Int, placeholder_index: Int)
}

pub type Model {
  Model(elements: Array(Element), drag_state: Option(DragState))
}

fn init(_flags) {
  Model(
    elements: iv.initialise(4, fn(i) {
      let id = int.to_string(i)
      Element("number-" <> id, "Number " <> id, False)
    }),
    drag_state: None,
  )
}

type Msg {
  DragStart(draggable_id: String)
  DragOver(dragged_over_id: String)
  DropEnd(dropped_id: String)
}

fn update(model, msg) {
  case model, msg {
    Model(elements:, ..), DragStart(draggable_id) -> {
      let drag_state =
        iv.find_index(elements, has_id(draggable_id))
        |> result.map(fn(placeholder_index) {
          DragState(
            element_id: draggable_id,
            element_index: placeholder_index,
            placeholder_index: placeholder_index,
          )
        })
        |> option.from_result

      let elements =
        iv.map(elements, fn(element) {
          Element(..element, is_placeholder: element.id == draggable_id)
        })
      Model(elements:, drag_state:)
    }
    Model(elements:, ..), DropEnd(dropped_id) -> {
      echo "drop_end " <> dropped_id <> " or maybe nothing"
      let elements =
        iv.map(elements, fn(element) {
          Element(..element, is_placeholder: False)
        })

      Model(elements:, drag_state: None)
    }
    Model(elements:, drag_state: Some(drag_state)), DragOver(dragged_over_id:) -> {
      let dragged_over_index = iv.find_index(elements, has_id(dragged_over_id))
      let elements =
        {
          use dragged_element <- result.try(iv.find(
            elements,
            has_id(drag_state.element_id),
          ))
          use dragged_over_index <- result.map(dragged_over_index)
          iv.try_delete(elements, drag_state.placeholder_index)
          |> iv.insert_clamped(dragged_over_index, dragged_element)
        }
        |> result.unwrap(elements)

      let drag_state =
        dragged_over_index
        |> result.map(fn(placeholder_index) {
          DragState(..drag_state, placeholder_index:)
        })
        |> result.unwrap(drag_state)

      Model(elements:, drag_state: Some(drag_state))
    }
    Model(..), DragOver(..) -> model
  }
}

fn has_id(id: String) {
  fn(element: Element) { element.id == id }
}

fn view(model: Model) {
  keyed.div(
    [],
    model.elements
      |> iv.to_list
      |> list.map(fn(element) {
        case element.is_placeholder {
          True -> #(
            "placeholder",
            droppable(
              id: "placeholder",
              on_drag_start: DragStart,
              on_drag_over: DragOver,
              on_drop: DropEnd,
              is_placeholder: True,
              children: [text(element.content)],
            ),
          )
          False -> #(
            element.id,
            droppable(
              id: element.id,
              on_drag_start: DragStart,
              on_drag_over: DragOver,
              on_drop: DropEnd,
              is_placeholder: False,
              children: [text(element.content)],
            ),
          )
        }
      }),
  )
}

fn droppable(
  id id: String,
  on_drag_start drag_start_handler: fn(String) -> msg,
  on_drag_over drag_over_handler: fn(String) -> msg,
  on_drop drop_handler: fn(String) -> msg,
  is_placeholder is_placeholder: Bool,
  children children,
) {
  let on_drag_start =
    event.on("dragstart", decode.success(drag_start_handler(id)))
  let on_drop =
    event.on("drop", decode.success(drop_handler(id)))
    |> event.prevent_default
  let on_drag_over =
    event.on("dragover", decode.success(drag_over_handler(id)))
    |> event.prevent_default
  let on_drag_end = event.on("dragend", decode.success(drop_handler("")))

  let attributes = case is_placeholder {
    True -> [class("draggable placeholder"), on_drop, on_drag_over, on_drag_end]
    False -> [
      class("draggable"),
      attribute("draggable", "true"),
      on_drag_start,
      on_drag_over,
      on_drop,
      on_drag_end,
    ]
  }

  div(attributes, children)
}
