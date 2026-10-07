import argparse

from portraits import publish

from . import bundle, export, grids, merge, report


def main():
    parser = argparse.ArgumentParser(prog="pipeline")
    commands = parser.add_subparsers(dest="command", required=True)
    build = commands.add_parser("build")
    build.add_argument("--refresh", action="store_true")
    commands.add_parser("grids")
    commands.add_parser("bundle")
    arguments = parser.parse_args()

    if arguments.command == "grids":
        for summary in grids.write():
            print(summary)
        return
    if arguments.command == "bundle":
        print(f"app database: {bundle.write()}")
        return

    dataset = merge.build(refresh=arguments.refresh)
    database_path = export.write(dataset)
    dataset["grid_summaries"] = grids.write(database_path)
    print(f"portraits: {publish.register(database_path)}")
    report_path = report.write(dataset)
    print(f"database: {database_path}")
    print(f"report: {report_path}")
    print(f"app database: {bundle.write(database_path)}")


if __name__ == "__main__":
    main()
