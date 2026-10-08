import argparse

from portraits import publish

from . import bundle, export, grids, merge, report, stats
from .registry import PlayerRegistry


def main():
    parser = argparse.ArgumentParser(prog="pipeline")
    commands = parser.add_subparsers(dest="command", required=True)
    build = commands.add_parser("build")
    build.add_argument("--refresh", action="store_true")
    commands.add_parser("grids")
    commands.add_parser("bundle")
    commands.add_parser("stats")
    arguments = parser.parse_args()

    if arguments.command == "grids":
        for summary in grids.write():
            print(summary)
        return
    if arguments.command == "stats":
        print(f"stats: {stats.write()}")
        print(f"app database: {bundle.refresh()}")
        return
    if arguments.command == "bundle":
        print(f"app database: {bundle.write()}")
        return

    registry = PlayerRegistry.load()
    dataset = merge.build(refresh=arguments.refresh, registry=registry)
    database_path = export.write(dataset)
    registry.save()
    dataset["grid_summaries"] = grids.write(database_path)
    print(f"portraits: {publish.register(database_path)}")
    print(f"stats: {stats.write(database_path)}")
    report_path = report.write(dataset)
    print(f"database: {database_path}")
    print(f"report: {report_path}")
    print(f"app database: {bundle.write(database_path)}")


if __name__ == "__main__":
    main()
