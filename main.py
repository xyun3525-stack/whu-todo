import io
import sys

from webui import run

try:
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8")
except AttributeError:
    pass


def main():
    run()


if __name__ == "__main__":
    main()
