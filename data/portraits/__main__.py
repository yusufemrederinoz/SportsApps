import argparse


def main():
    parser = argparse.ArgumentParser(prog="portraits")
    commands = parser.add_subparsers(dest="command", required=True)
    for name in ("fetch", "crop", "enlarge", "alternatives", "stylize", "all"):
        command = commands.add_parser(name)
        command.add_argument("--limit", type=int, default=None)
    commands.add_parser("review")
    commands.add_parser("export")
    arguments = parser.parse_args()

    if arguments.command in ("fetch", "all"):
        from . import sources

        print("fetch:", sources.fetch(arguments.limit))
    if arguments.command in ("crop", "all"):
        from . import faces

        print("crop:", faces.crop_all(arguments.limit))
    if arguments.command in ("enlarge", "all"):
        from . import faces

        print("enlarge:", faces.enlarge(arguments.limit))
    if arguments.command == "alternatives":
        from . import alternatives

        print("alternatives:", alternatives.run(arguments.limit))
    if arguments.command in ("stylize", "all"):
        from . import stylize

        print("stylize:", stylize.run(arguments.limit))
    if arguments.command in ("review", "all"):
        from . import review

        print("review:", review.run())
    if arguments.command in ("export", "all"):
        from . import publish

        print("export:", publish.write())


if __name__ == "__main__":
    main()
