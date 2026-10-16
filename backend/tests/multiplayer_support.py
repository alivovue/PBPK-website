from app.logic.multiplayer.models import Option, Question


class FakeClock:
    def __init__(self, value=100.0):
        self.value = value

    def __call__(self):
        return self.value

    def advance(self, seconds):
        self.value += seconds


def questions(count=20):
    return [Question(
        id=index, text=f"Question {index}",
        options=tuple(Option(index * 10 + option, f"Option {option}") for option in range(4)),
        correct_option_id=index * 10,
    ) for index in range(1, count + 1)]
