import argparse

from . import export, grids, merge, report


def main():
    parser = argparse.ArgumentParser(prog="pipeline")
    commands = parser.add_subparsers(dest="command", required=True)
    build = commands.add_parser("build")
    build.add_argument("--refresh", action="store_true")
    commands.add_parser("grids")
    arguments = parser.parse_args()

    if arguments.command == "grids":
        for summary in grids.write():
            print(summary)
        return

    dataset = merge.build(refresh=arguments.refresh)
    database_path = export.write(dataset)
    dataset["grid_summaries"] = grids.write(database_path)
    report_path = report.write(dataset)
    print(f"database: {database_path}")
    print(f"report: {report_path}")


if __name__ == "__main__":
    main()
