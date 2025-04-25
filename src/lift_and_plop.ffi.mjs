export const listen_for_pointer_move = (dispatch) => {
  document.addEventListener("pointermove", (event) => {
    dispatch(event);
  });
};
